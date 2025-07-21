package com.mustika;

import android.content.Intent;
import android.content.Context;
import android.app.PendingIntent;
import android.net.sip.*;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.*;
import com.facebook.react.module.annotations.ReactModule;

@ReactModule(name = SipModule.NAME)
public class SipModule extends ReactContextBaseJavaModule {
    public static final String NAME = "SipModule";
    private SipManager sipManager;
    private SipProfile sipProfile;
    private SipAudioCall call;
    private String currentDomain; // Store domain separately

    public SipModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return NAME;
    }

    @ReactMethod
    public void register(String username, String domain, String password, Promise promise) {
        try {
            sipManager = SipManager.newInstance(getReactApplicationContext());
            SipProfile.Builder builder = new SipProfile.Builder(username, domain);
            builder.setPassword(password);
            sipProfile = builder.build();
            currentDomain = domain; // Store the domain for later use

            Intent intent = new Intent();
            PendingIntent pendingIntent = PendingIntent.getBroadcast(getReactApplicationContext(), 0, intent, PendingIntent.FLAG_IMMUTABLE);
            sipManager.open(sipProfile, pendingIntent, null);
            promise.resolve("Registered");
        } catch (Exception e) {
            promise.reject("REGISTER_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void makeCall(String callee, Promise promise) {
        try {
            if (sipManager == null || sipProfile == null) {
                promise.reject("CALL_ERROR", "Not registered yet");
                return;
            }

            SipAudioCall.Listener listener = new SipAudioCall.Listener() {
                @Override
                public void onCallEstablished(SipAudioCall call) {
                    call.startAudio();
                }

                @Override
                public void onCallEnded(SipAudioCall call) {
                    // Handle call end
                }
            };

            // Use the stored domain instead of sipProfile.getDomain()
            SipProfile.Builder builder = new SipProfile.Builder(callee, currentDomain);
            SipProfile peer = builder.build();
            
            call = sipManager.makeAudioCall(sipProfile.getUriString(), peer.getUriString(), listener, 30);
            promise.resolve("Call started");
        } catch (Exception e) {
            promise.reject("CALL_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void endCall(Promise promise) {
        try {
            if (call != null) {
                call.endCall();
                call.close();
                promise.resolve("Call ended");
            } else {
                promise.reject("CALL_ERROR", "No active call");
            }
        } catch (Exception e) {
            promise.reject("CALL_ERROR", e.getMessage());
        }
    }
}