import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) throw new Error('Authentication error');

      // Fetch wallet data
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userData.user.id)
        .single();

      if (walletError && walletError.code !== 'PGRST116') {
        throw new Error('Failed to fetch wallet data');
      }

      setWallet(walletData || { balance: 0, currency: 'USD' });

      // Fetch recent transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select(`
          id,
          transaction_type,
          amount,
          status,
          created_at,
          qr_codes (
            code_value,
            description
          )
        `)
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (txError) throw new Error('Failed to fetch transactions');

      setTransactions(txData || []);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text>Loading wallet data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.walletCard}>
        <Text style={styles.walletTitle}>My Wallet</Text>
        <Text style={styles.balance}>{wallet?.currency} {parseFloat(wallet?.balance || 0).toFixed(2)}</Text>
        <Text style={styles.lastUpdated}>
          Last updated: {wallet?.last_updated ? formatDate(wallet.last_updated) : 'Never'}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>

      {transactions.length === 0 ? (
        <Text style={styles.noTransactions}>No transactions yet</Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.transactionItem}>
              <View style={styles.transactionHeader}>
                <Text style={[
                  styles.transactionType,
                  item.transaction_type === 'deposit' ? styles.deposit : styles.payment
                ]}>
                  {item.transaction_type.toUpperCase()}
                </Text>
                <Text style={[
                  styles.transactionAmount,
                  item.transaction_type === 'deposit' ? styles.deposit : styles.payment
                ]}>
                  {item.transaction_type === 'deposit' ? '+' : '-'}{item.amount}
                </Text>
              </View>

              <Text style={styles.transactionDescription}>
                {item.qr_codes?.description || 'No description'}
              </Text>

              <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>

              <View style={[
                styles.statusIndicator,
                item.status === 'completed' ? styles.statusCompleted : styles.statusPending
              ]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
          )}
          style={styles.transactionList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletCard: {
    backgroundColor: '#007BFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  walletTitle: {
    color: 'white',
    fontSize: 16,
    marginBottom: 10,
  },
  balance: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  lastUpdated: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  noTransactions: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  },
  transactionList: {
    flex: 1,
  },
  transactionItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  transactionType: {
    fontWeight: 'bold',
  },
  transactionAmount: {
    fontWeight: 'bold',
  },
  deposit: {
    color: '#28a745',
  },
  payment: {
    color: '#dc3545',
  },
  transactionDescription: {
    marginBottom: 5,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  statusIndicator: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusCompleted: {
    backgroundColor: 'rgba(40, 167, 69, 0.2)',
  },
  statusPending: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
  },
  statusText: {
    fontSize: 12,
  },
});