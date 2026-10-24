package com.qiumu.reallifeenglish;

import android.app.Activity;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.speech.tts.TextToSpeech;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Locale;

public class AppBridge {
    private final Activity activity;
    private final AppUpdater updater;
    private TextToSpeech textToSpeech;
    private boolean speechReady;
    private final Map<String,String> imageCache = new LinkedHashMap<String,String>(8,0.75f,true) {
        @Override protected boolean removeEldestEntry(Map.Entry<String,String> entry) { return size()>6; }
    };
    AppBridge(Activity activity, AppUpdater updater) {
        this.activity=activity; this.updater=updater;
        textToSpeech=new TextToSpeech(activity,new TextToSpeech.OnInitListener(){
            @Override public void onInit(int status){speechReady=status==TextToSpeech.SUCCESS;if(speechReady)textToSpeech.setLanguage(Locale.US);}
        });
    }
    @JavascriptInterface public void checkUpdates() { updater.checkUpdates(); }
    @JavascriptInterface public void speak(String word) {
        if(word==null||!word.matches("[A-Za-z'-]+"))return;
        activity.runOnUiThread(new Runnable(){@Override public void run(){if(speechReady)textToSpeech.speak(word,TextToSpeech.QUEUE_FLUSH,null,"word");}});
    }
    public void shutdown(){if(textToSpeech!=null)textToSpeech.shutdown();}
    @JavascriptInterface public synchronized String getImageData(String path) {
        if(path==null || !path.matches("data/[a-z0-9-]+/images/[a-z0-9-]+\\.jpg")) return "";
        if(imageCache.containsKey(path)) return imageCache.get(path);
        try(InputStream input=activity.getAssets().open(path)) {
            ByteArrayOutputStream output=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int count;
            while((count=input.read(buffer))!=-1){output.write(buffer,0,count);if(output.size()>2*1024*1024)return "";}
            byte[] bytes=output.toByteArray();
            String mime=bytes.length>2&&bytes[0]==(byte)255&&bytes[1]==(byte)216?"image/jpeg":"image/png";
            String result="data:"+mime+";base64,"+Base64.encodeToString(bytes,Base64.NO_WRAP);
            imageCache.put(path,result);return result;
        }catch(Exception error){return "";}
    }
}
