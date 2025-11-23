import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setCredentials, setAdminToken } from '../store/authSlice';
import api from '../services/api';
import { MessageSquare, Key, Server, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const dispatch = useDispatch();
  const [mode, setMode] = useState<'token' | 'admin'>('token');
  const [token, setToken] = useState('');
  const [adminToken, setAdminTokenInput] = useState('');
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTokenLogin = async () => {
    if (!token.trim()) {
      setError('Token is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      api.setToken(token);
      const status = await api.getStatus();

      dispatch(
        setCredentials({
          token,
          instanceId: 'direct',
          instanceName: 'Direct Connection',
        })
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid token');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    if (!adminToken.trim()) {
      setError('Admin token is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.getInstances(adminToken);
      setInstances(Array.isArray(data) ? data : []);
      dispatch(setAdminToken(adminToken));
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid admin token');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInstance = (instance: any) => {
    setSelectedInstance(instance);
    dispatch(
      setCredentials({
        token: instance.token,
        instanceId: instance.id,
        instanceName: instance.name,
      })
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl mb-4">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">WuzAPI Chat</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            WhatsApp Management Panel
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          {/* Mode Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
            <button
              onClick={() => setMode('token')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-colors ${
                mode === 'token'
                  ? 'bg-white dark:bg-gray-600 shadow-sm text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Key className="w-4 h-4" />
              Token
            </button>
            <button
              onClick={() => setMode('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-colors ${
                mode === 'admin'
                  ? 'bg-white dark:bg-gray-600 shadow-sm text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Server className="w-4 h-4" />
              Admin
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {mode === 'token' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Instance Token
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTokenLogin()}
                  placeholder="Enter your instance token"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleTokenLogin}
                disabled={loading}
                className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {instances.length === 0 ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Admin Token
                    </label>
                    <input
                      type="password"
                      value={adminToken}
                      onChange={(e) => setAdminTokenInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                      placeholder="Enter admin token"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={handleAdminLogin}
                    disabled={loading}
                    className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Load Instances'
                    )}
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Select an instance to connect:
                  </p>
                  {instances.map((instance) => (
                    <button
                      key={instance.id}
                      onClick={() => handleSelectInstance(instance)}
                      className="w-full p-4 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {instance.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {instance.jid || 'Not connected'}
                          </p>
                        </div>
                        <div
                          className={`w-3 h-3 rounded-full ${
                            instance.connected
                              ? 'bg-green-500'
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        />
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => setInstances([])}
                    className="w-full py-2 text-gray-600 dark:text-gray-400 text-sm hover:text-gray-900 dark:hover:text-white"
                  >
                    Back
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-6">
          Powered by WuzAPI
        </p>
      </div>
    </div>
  );
}
