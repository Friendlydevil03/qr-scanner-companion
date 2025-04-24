import React, { useState } from 'react';
import { Text, View, StyleSheet, TextInput, Button, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../lib/supabase';

export default function QRGenerator() {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionType, setTransactionType] = useState('payment'); // or 'deposit'
  const [qrValue, setQrValue] = useState('');

  const generateQRCode = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      // Get user information
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) throw new Error('Authentication error');

      // Create QR code data object
      const qrData = {
        transaction_type: transactionType,
        amount: parseFloat(amount),
        description: description,
        timestamp: new Date().toISOString(),
        generated_by: userData.user.id
      };

      // Convert to JSON string
      const qrValueString = JSON.stringify(qrData);
      setQrValue(qrValueString);

      // Save to Supabase
      const { error: qrError } = await supabase
        .from('qr_codes')
        .insert({
          user_id: userData.user.id,
          code_type: 'qr',
          code_value: qrValueString,
          description: description || `${transactionType} for ${amount}`
        });

      if (qrError) throw new Error('Failed to save QR code');

      Alert.alert('Success', 'QR Code generated successfully');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Generate Payment QR Code</Text>

      <View style={styles.inputContainer}>
        <Text>Transaction Type:</Text>
        <View style={styles.radioContainer}>
          <Button
            title="Payment"
            onPress={() => setTransactionType('payment')}
            color={transactionType === 'payment' ? '#007BFF' : '#ccc'}
          />
          <Button
            title="Deposit"
            onPress={() => setTransactionType('deposit')}
            color={transactionType === 'deposit' ? '#007BFF' : '#ccc'}
          />
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text>Amount:</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="Enter amount"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text>Description:</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter description"
        />
      </View>

      <Button title="Generate QR Code" onPress={generateQRCode} />

      {qrValue ? (
        <View style={styles.qrContainer}>
          <QRCode
            value={qrValue}
            size={200}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginTop: 5,
    width: '100%',
  },
  qrContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});