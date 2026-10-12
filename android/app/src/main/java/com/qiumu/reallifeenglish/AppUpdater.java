package com.qiumu.reallifeenglish;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.concurrent.atomic.AtomicBoolean;

public class AppUpdater {
    static final int INSTALL_PERMISSION = 101;
    private final Activity activity;
    private final AtomicBoolean busy = new AtomicBoolean(false);
    private static final String REPO = "https://github.com/Qiumu0o0/RealLifeEnglish/releases/download/";
    AppUpdater(Activity activity) { this.activity = activity; }
    private void ui(Runnable action) {
        if (!activity.isFinishing() && !activity.isDestroyed()) activity.runOnUiThread(action);
    }
    private void message(final String text) {
        ui(new Runnable() { public void run() { Toast.makeText(activity, text, Toast.LENGTH_LONG).show(); } });
    }
    private HttpURLConnection connect(String address) throws Exception {
        URL url = new URL(address);
        for (int i = 0; i < 6; i++) {
            if (!"https".equals(url.getProtocol())) throw new Exception("HTTPS required");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(15000); connection.setReadTimeout(30000);
            connection.setRequestProperty("User-Agent", "RealLifeEnglish-Android");
            connection.setInstanceFollowRedirects(false);
            int status = connection.getResponseCode();
            if (status >= 300 && status < 400) {
                String location = connection.getHeaderField("Location"); connection.disconnect();
                if (location == null) throw new Exception("Missing redirect");
                url = new URL(url, location); continue;
            }
            if (status != 200) { connection.disconnect(); throw new Exception("HTTP " + status); }
            return connection;
        }
        throw new Exception("Too many redirects");
    }
    @JavascriptInterface public void checkUpdates() {
        if (!busy.compareAndSet(false, true)) { message("正在处理更新，请稍候"); return; }
        message("正在检查最新版本…");
        new Thread(new Runnable() { public void run() {
            try {
                HttpURLConnection connection = connect("https://api.github.com/repos/Qiumu0o0/RealLifeEnglish/releases/latest");
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                try (InputStream input = connection.getInputStream()) {
                    byte[] buffer = new byte[8192]; int count;
                    while ((count = input.read(buffer)) != -1) {
                        bytes.write(buffer, 0, count);
                        if (bytes.size() > 1024 * 1024) throw new Exception("Response too large");
                    }
                } finally { connection.disconnect(); }
                JSONObject release = new JSONObject(bytes.toString("UTF-8"));
                final String tag = release.getString("tag_name");
                String local = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0).versionName;
                if (!UpdateVersion.isNewer(tag, local)) { message("已是最新版本 " + local); return; }
                JSONArray assets = release.getJSONArray("assets"); JSONObject apk = null;
                for (int i = 0; i < assets.length(); i++) if ("RealLifeEnglish.apk".equals(assets.getJSONObject(i).optString("name"))) apk = assets.getJSONObject(i);
                if (apk == null) throw new Exception("APK missing");
                final String url = apk.getString("browser_download_url"), digest = apk.optString("digest", "");
                final long size = apk.getLong("size");
                if (!url.startsWith(REPO + tag + "/") || size < 1 || size > 64L * 1024 * 1024) throw new Exception("Invalid release asset");
                ui(new Runnable() { public void run() {
                    new AlertDialog.Builder(activity).setTitle("发现新版本 " + tag)
                        .setMessage("下载并安装更新？学习进度将保留。")
                        .setNegativeButton("稍后", null)
                        .setPositiveButton("下载更新", new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface dialog, int which) { download(url, digest, size); }
                        }).show();
                } });
            } catch (Exception error) { message("检查失败，请检查网络或稍后重试"); }
            finally { busy.set(false); }
        } }).start();
    }
    private void download(final String url, final String digest, final long size) {
        if (!busy.compareAndSet(false, true)) return;
        message("正在下载更新，请保持应用打开…");
        new Thread(new Runnable() { public void run() {
            File part = new File(activity.getFilesDir(), "update.apk.part");
            try {
                MessageDigest hash = MessageDigest.getInstance("SHA-256");
                HttpURLConnection connection = connect(url); long received = 0;
                try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(part)) {
                    byte[] buffer = new byte[16384]; int count;
                    while ((count = input.read(buffer)) != -1) {
                        received += count; if (received > size) throw new Exception("Size mismatch");
                        output.write(buffer, 0, count); hash.update(buffer, 0, count);
                    }
                } finally { connection.disconnect(); }
                if (received != size) throw new Exception("Incomplete download");
                StringBuilder hex = new StringBuilder(); for (byte b : hash.digest()) hex.append(String.format("%02x", b & 255));
                if (digest.startsWith("sha256:") && !digest.substring(7).equalsIgnoreCase(hex.toString())) throw new Exception("Digest mismatch");
                PackageInfo info = activity.getPackageManager().getPackageArchiveInfo(part.getAbsolutePath(), 0);
                PackageInfo local = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
                if (info == null || !activity.getPackageName().equals(info.packageName) || info.versionCode <= local.versionCode) throw new Exception("Invalid APK version");
                File apk = new File(activity.getFilesDir(), "update.apk");
                if (apk.exists() && !apk.delete()) throw new Exception("Cannot replace APK");
                if (!part.renameTo(apk)) throw new Exception("Cannot finalize APK");
                ui(new Runnable() { public void run() { install(); } });
            } catch (Exception error) { part.delete(); message("更新下载失败，请稍后重试"); }
            finally { busy.set(false); }
        } }).start();
    }
    void install() {
        try {
            if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
                new AlertDialog.Builder(activity).setTitle("允许安装更新")
                    .setMessage("请在系统设置中允许此应用安装更新，然后返回。")
                    .setNegativeButton("取消", null)
                    .setPositiveButton("去设置", new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface dialog, int which) {
                            activity.startActivityForResult(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + activity.getPackageName())), INSTALL_PERMISSION);
                        }
                    }).show(); return;
            }
            Uri uri = Uri.parse("content://" + activity.getPackageName() + ".updates/update.apk");
            Intent intent = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            activity.startActivity(intent);
        } catch (Exception error) { message("无法打开安装程序，请重试"); }
    }
    void permissionReturned() {
        if (Build.VERSION.SDK_INT < 26 || activity.getPackageManager().canRequestPackageInstalls()) install();
        else message("未允许安装更新，可稍后重试");
    }
}
