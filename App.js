import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Button,
  Text,
  NativeEventEmitter,
  NativeModules,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';

// Add null checks and better module handling
const { SipModule } = NativeModules;
const SipCallManager = NativeModules.SipCallManager || {};

console.log('Available Native Modules:', Object.keys(NativeModules));
console.log('SipModule:', SipModule ? '✅ Loaded' : '❌ Not loaded');
console.log('SipCallManager:', SipCallManager ? '✅ Loaded' : '❌ Not loaded');

const sipEvents = SipModule && Platform.OS === 'android' ? new NativeEventEmitter(SipModule) : null;

export default function App() {
  const [sipUsername, setSipUsername] = useState('');
  const [sipPassword, setSipPassword] = useState('');
  const [sipDomain, setSipDomain] = useState('');
  const [callee, setCallee] = useState('');
  const [status, setStatus] = useState('Not connected');
  const [isRegistered, setIsRegistered] = useState(false);

  // Request necessary permissions
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            PermissionsAndroid.PERMISSIONS.USE_SIP,
            PermissionsAndroid.PERMISSIONS.INTERNET,
          ]);
          
          if (granted['android.permission.RECORD_AUDIO'] !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Permissions required', 'Audio permissions are needed for calls');
          }
        } catch (err) {
          console.warn('Permission error:', err);
        }
      }
    };

    requestPermissions();
  }, []);

  // Initialize SIP listeners
  useEffect(() => {
    if (Platform.OS === 'android' && SipModule && sipEvents) {
      console.log('Initializing SIP event listeners...');
      
      try {
        SipModule.initialize();
        SipModule.listenForIncomingCalls();
      } catch (err) {
        console.warn('Initialization error:', err);
        setStatus('❌ Initialization failed');
      }

      const subscriptions = [
        sipEvents.addListener('RegistrationSuccess', () => {
          console.log('✅ Registration successful');
          setIsRegistered(true);
          setStatus('✅ Registered successfully');
        }),
        sipEvents.addListener('RegistrationFailed', (error) => {
          console.log('❌ Registration failed:', error);
          setIsRegistered(false);
          setStatus(`❌ Registration failed: ${error.message || error}`);
        }),
        sipEvents.addListener('IncomingCall', (from) => {
          console.log('📞 Incoming Call from', from);
          setStatus(`📞 Incoming call from ${from}`);
          // Add call acceptance logic here
        }),
        sipEvents.addListener('CallEstablished', () => {
          console.log('✅ Call connected');
          setStatus('✅ Call connected');
        }),
        sipEvents.addListener('CallEnded', () => {
          console.log('📴 Call ended');
          setStatus('📴 Call ended');
        }),
        sipEvents.addListener('CallError', (err) => {
          console.log('❌ Call error:', err);
          setStatus(`❌ Call error: ${err.message || err}`);
        }),
      ];

      return () => {
        subscriptions.forEach((sub) => sub.remove());
      };
    }
  }, []);

  const handleLogin = async () => {
    if (!sipUsername || !sipPassword || !sipDomain) {
      setStatus('⚠️ Fill all SIP login fields');
      return;
    }

    if (!SipModule) {
      console.error('❌ SipModule is not available.');
      setStatus('❌ Native module not loaded');
      return;
    }

    setStatus('Registering...');
    try {
      // Initialize SIP manager first
      await SipCallManager.init(sipUsername, sipDomain, sipPassword);
      
      // Then register with SIP server
      const result = await SipModule.register(sipUsername, sipDomain, sipPassword);
      console.log('Registration result:', result);
      setStatus('✅ Registration in progress');
    } catch (err) {
      console.error('Registration error:', err);
      setStatus(`❌ Error: ${err.message || err}`);
    }
  };

  const handleCall = async () => {
    if (!callee) {
      setStatus('⚠️ Enter SIP number to call.');
      return;
    }

    if (!isRegistered) {
      setStatus('⚠️ Please register first');
      return;
    }

    if (!SipModule || !SipCallManager) {
      setStatus('❌ SIP not available');
      return;
    }

    setStatus('📞 Calling...');
    try {
      await SipCallManager.makeCall(callee);
      setStatus('✅ Call initiated');
    } catch (err) {
      console.error('Call error:', err);
      setStatus(`❌ Call failed: ${err.message || err}`);
    }
  };

  const handleHangup = async () => {
    try {
      await SipCallManager.hangup();
      setStatus('📴 Call ended');
    } catch (err) {
      console.error('Hangup error:', err);
      setStatus(`❌ Hangup failed: ${err.message || err}`);
    }
  };

  return (
    <View style={{ padding: 20, flex: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>SIP Client</Text>
      
      <Text style={{ fontSize: 16 }}>SIP Login</Text>
      <TextInput
        placeholder="SIP Username"
        value={sipUsername}
        onChangeText={setSipUsername}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 }}
      />
      <TextInput
        placeholder="SIP Password"
        secureTextEntry
        value={sipPassword}
        onChangeText={setSipPassword}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 }}
      />
      <TextInput
        placeholder="SIP Domain (e.g. sip.example.com)"
        value={sipDomain}
        onChangeText={setSipDomain}
        style={{ borderWidth: 1, padding: 10, marginBottom: 20, borderRadius: 5 }}
      />
      
      <Button 
        title={isRegistered ? "Registered ✅" : "Login to SIP"} 
        onPress={handleLogin}
        disabled={isRegistered}
      />

      <Text style={{ fontSize: 16, marginTop: 30 }}>Make a Call</Text>
      <TextInput
        placeholder="SIP Number to Call (e.g. 1000)"
        value={callee}
        onChangeText={setCallee}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 }}
        editable={isRegistered}
      />
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Button 
          title="Call" 
          onPress={handleCall}
          disabled={!isRegistered}
        />
        <Button 
          title="Hangup" 
          onPress={handleHangup}
          color="red"
        />
      </View>

      <Text style={{ 
        marginTop: 30, 
        fontSize: 16, 
        color: status.startsWith('✅') ? 'green' : status.startsWith('❌') ? 'red' : 'blue',
        fontWeight: 'bold'
      }}>
        Status: {status}
      </Text>

      {/* Add debug info */}
      {__DEV__ && (
        <Text style={{ marginTop: 20, fontSize: 12, color: 'gray' }}>
          Debug: {Platform.OS} | {NativeModules.SipModule ? 'Module loaded' : 'Module missing'}
        </Text>
      )}
    </View>
  );
}