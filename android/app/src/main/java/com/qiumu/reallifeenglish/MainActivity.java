package com.qiumu.reallifeenglish;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;

public class MainActivity extends Activity {
    private WebView webView;
    private AppUpdater updater;
    private AppBridge bridge;
    private ValueCallback<Uri[]> fileCallback;
    private static final int PICK_FILE = 100;
    private static final String HOST = "appassets.androidplatform.net";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        setContentView(webView);
        // Keep content clear of status/navigation bars, including Android 15.
        webView.setOnApplyWindowInsetsListener(new android.view.View.OnApplyWindowInsetsListener() {
            @Override public android.view.WindowInsets onApplyWindowInsets(android.view.View view, android.view.WindowInsets insets) {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
                return insets.consumeSystemWindowInsets();
            }
        });
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setLoadsImagesAutomatically(true);
        webView.getSettings().setCacheMode(android.webkit.WebSettings.LOAD_NO_CACHE);
        webView.getSettings().setAllowFileAccess(false);
        webView.getSettings().setAllowContentAccess(true);
        updater = new AppUpdater(this);
        bridge = new AppBridge(this, updater);
        webView.addJavascriptInterface(bridge, "AndroidApp");
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String path = uri.getPath();
                // Returning null lets WebView perform the HTTPS request (including CORS).
                // Never allow remote documents to navigate into this bridge-enabled WebView.
                if (!request.isForMainFrame() && NetworkPolicy.allowsCloud(uri.getScheme(), uri.getHost(), uri.getPort(), path)) {
                    return null;
                }
                if (!HOST.equals(uri.getHost()) || path == null || !path.startsWith("/assets/") || path.contains("..")) {
                    return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
                }
                String asset = path.substring(8);
                String mime = asset.endsWith(".jpg") ? "image/jpeg" : asset.endsWith(".js") ? "application/javascript" : asset.endsWith(".json") ? "application/json" : "text/html";
                try { return new WebResourceResponse(mime, "UTF-8", getAssets().open(asset)); }
                catch (IOException error) { return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, new ByteArrayInputStream(new byte[0])); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !HOST.equals(request.getUrl().getHost());
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                try { startActivityForResult(intent, PICK_FILE); }
                catch (android.content.ActivityNotFoundException error) { fileCallback.onReceiveValue(null); fileCallback = null; }
                return true;
            }
        });
        // Progress is persisted by the app; always load the installed HTML after an update.
        webView.loadUrl("https://" + HOST + "/assets/index.html");
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == AppUpdater.INSTALL_PERMISSION) updater.permissionReturned();
        if (request == PICK_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(result == RESULT_OK && data != null && data.getData() != null ? new Uri[]{data.getData()} : null);
            fileCallback = null;
        }
    }
    @Override protected void onSaveInstanceState(Bundle state) { super.onSaveInstanceState(state); webView.saveState(state); }
    public void refreshSpeechVoices(){
        if(bridge!=null)bridge.refreshSpeechEngine(bridge.getActiveEngine(),new Runnable(){@Override public void run(){webView.evaluateJavascript("window.speechEngineReady&&window.speechEngineReady()",null);}});
    }
    public void switchSpeechEngine(String engine){if(bridge!=null)bridge.refreshSpeechEngine(engine,new Runnable(){@Override public void run(){webView.evaluateJavascript("window.speechEngineReady&&window.speechEngineReady()",null);}});}
    @Override protected void onResume(){
        super.onResume();
        if(bridge!=null&&bridge.consumeSpeechInstallerOpened())refreshSpeechVoices();
    }
    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        if (bridge != null) bridge.shutdown();
        webView.destroy();
        super.onDestroy();
    }
}
