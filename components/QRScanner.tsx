import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Button, Alert } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { supabase } from '../lib/supabase';

export default function QRScanner() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanned(true);

    try {
      // Parse the QR code data - assuming it's JSON with transaction details
      const qrData = JSON.parse(data);

      // Get the current user
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) throw new Error('Authentication error');

      // Save the QR code to the database
      const { data: qrCodeData, error: qrError } = await supabase
        .from('qr_codes')
        .insert({
          user_id: userData.user.id,
          code_type: type,
          code_value: data,
          description: qrData.description || 'Scanned QR code'
        })
        .select()
        .single();

      if (qrError) throw new Error('Failed to save QR code');

      // Process transaction if the QR code contains transaction data
      if (qrData.amount && qrData.transaction_type) {
        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: userData.user.id,
            qr_code_id: qrCodeData.id,
            transaction_type: qrData.transaction_type,
            amount: qrData.amount,
            status: 'completed'
          });

        if (txError) throw new Error('Failed to process transaction');

        // Update wallet balance
        const { data: walletData, error: walletFetchError } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', userData.user.id)
          .single();

        if (walletFetchError && walletFetchError.code !== 'PGRST116') {
          throw new Error('Failed to fetch wallet');
        }

        let walletId;

        if (!walletData) {
          // Create a new wallet if one doesn't exist
          const { data: newWallet, error: createWalletError } = await supabase
            .from('wallets')
            .insert({
              user_id: userData.user.id,
              balance: qrData.transaction_type === 'deposit' ? qrData.amount : -qrData.amount
            })
            .select()
            .single();

          if (createWalletError) throw new Error('Failed to create wallet');
          walletId = newWallet.id;
        } else {
          // Update existing wallet
          const newBalance = qrData.transaction_type === 'deposit'
            ? parseFloat(walletData.balance) + parseFloat(qrData.amount)
            : parseFloat(walletData.balance) - parseFloat(qrData.amount);

          const { error: updateWalletError } = await supabase
            .from('wallets')
            .update({
              balance: newBalance,
              last_updated: new Date().toISOString()
            })
            .eq('id', walletData.id);

          if (updateWalletError) throw new Error('Failed to update wallet');
          walletId = walletData.id;
        }

        Alert.alert(
          'Success',
          `QR code scanned and transaction processed: ${qrData.transaction_type} ${qrData.amount}`
        );
      } else {
        Alert.alert('QR Code Scanned', `Type: ${type}\nData: ${data}`);
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
    }
  };

  if (hasPermission === null) {
    return <Text>Requesting for camera permission</Text>;
  }

  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />
      {scanned && (
        <Button title={'Tap to Scan Again'} onPress={() => setScanned(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
});