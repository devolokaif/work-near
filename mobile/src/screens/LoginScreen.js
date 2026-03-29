
// ─── LoginScreen.js ─────────────────────────────────────────
export function LoginScreen({ navigation }) {
  const { login, register } = useAuthStore();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { authAPI } = require('../services/api');
  const { useState } = require('react');

  const sendOTP = async () => {
    if (phone.length < 10) return setError('Enter valid 10-digit number');
    setLoading(true); setError('');
    try {
      await authAPI.sendOTP(`+91${phone}`);
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const verifyOTP = async () => {
    setLoading(true); setError('');
    try {
      const result = await login(`+91${phone}`, otp);
      if (!result.exists) {
        navigation.navigate('Register', { token: result.token, phone });
      }
    } catch (err) {
      setError('Invalid OTP');
    } finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF7F2', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontFamily: 'serif', fontSize: 36, color: '#F4600C', textAlign: 'center', marginBottom: 8 }}>WorkNear</Text>
      <Text style={{ color: '#A08060', textAlign: 'center', fontSize: 16, marginBottom: 40 }}>
        {step === 'phone' ? 'Enter your mobile number' : `OTP sent to +91 ${phone}`}
      </Text>

      {step === 'phone' ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <View style={{ backgroundColor: '#F0EAE0', borderRadius: 10, padding: 14, justifyContent: 'center' }}>
              <Text style={{ fontWeight: '700', color: '#5C4A32', fontSize: 16 }}>+91</Text>
            </View>
            <TextInput
              style={{ flex: 1, backgroundColor: 'white', borderRadius: 10, padding: 14, fontSize: 18, fontWeight: '600', color: '#2C2417', borderWidth: 1.5, borderColor: '#F0EAE0' }}
              placeholder="98765 43210" keyboardType="phone-pad" maxLength={10}
              value={phone} onChangeText={setPhone}
            />
          </View>
          {error ? <Text style={{ color: '#DC2626', marginBottom: 10, fontSize: 14 }}>{error}</Text> : null}
          <TouchableOpacity style={{ backgroundColor: '#F4600C', borderRadius: 12, padding: 16, alignItems: 'center' }}
            onPress={sendOTP} disabled={loading}>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
              {loading ? 'Sending...' : 'Send OTP'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={{ backgroundColor: 'white', borderRadius: 10, padding: 16, fontSize: 24, fontWeight: '700', color: '#2C2417', borderWidth: 1.5, borderColor: '#F0EAE0', textAlign: 'center', letterSpacing: 8, marginBottom: 16 }}
            placeholder="••••••" keyboardType="number-pad" maxLength={6}
            value={otp} onChangeText={setOtp}
          />
          {error ? <Text style={{ color: '#DC2626', marginBottom: 10, fontSize: 14, textAlign: 'center' }}>{error}</Text> : null}
          <TouchableOpacity style={{ backgroundColor: '#F4600C', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 }}
            onPress={verifyOTP} disabled={loading || otp.length < 6}>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep('phone')}>
            <Text style={{ color: '#A08060', textAlign: 'center', fontSize: 14 }}>← Change number</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

export default HomeScreen;