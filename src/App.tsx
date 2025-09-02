import React, { useState, useEffect } from 'react';
import { Send, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';

interface FormData {
  parcelId: string;
  address: string;
  county: string;
  state: string;
  propertyType: 'Residential' | 'Land';
}

interface FormState {
  isSubmitting: boolean;
  submitted: boolean;
  error: string | null;
  success: boolean;
}


interface ListingField {
  value?: any;
  required?: boolean;
  unit?: string;
  year?: number;
  [key: string]: any;
}

interface PropertyData {
  propertyType: string;
  listingData: Record<string, any>;
  _receivedAt?: string | null;
}

function App() {
  const [formData, setFormData] = useState<FormData>({
    parcelId: '',
    address: '',
    county: '',
    state: '',
    propertyType: 'Residential'
  });

  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    submitted: false,
    error: null,
    success: false
  });

  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isWaitingForResults, setIsWaitingForResults] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; createdAt: number; parcelId?: string; county?: string; state?: string; summary?: string }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

  const humanize = (str: string) =>
    str
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .replace(/^./, s => s.toUpperCase());

  const parsePropertyData = (raw: any): PropertyData => {
    const listingData =
      raw?.propertyData && typeof raw.propertyData === 'object'
        ? raw.propertyData
        : raw?.listingData && typeof raw.listingData === 'object'
        ? raw.listingData
        : {};

    return {
      propertyType: raw?.propertyType || 'Residential',
      listingData,
      _receivedAt: raw?._receivedAt ?? null,
    };
  };

  const handleFieldChange = (path: string[], value: any) => {
    setPropertyData(prev => {
      if (!prev) return prev;
      const listingData: any = { ...prev.listingData };
      let current: any = listingData;
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        current[key] = { ...(current[key] as any) };
        current = current[key];
      }
      const lastKey = path[path.length - 1];
      const field: ListingField = current[lastKey]
        ? { ...(current[lastKey] as ListingField), value }
        : { value, required: false };
      current[lastKey] = field;
      return { ...prev, listingData };
    });
  };

  const hasMissingRequired = (section: any): boolean =>
    Object.values(section).some((field: any) => {
      if (field && typeof field === 'object') {
        if ('value' in field) {
          const v = field.value;
          return (
            field.required &&
            (v === null ||
              v === '' ||
              v === '<UNKNOWN>' ||
              (Array.isArray(v) && v.length === 0))
          );
        }
        return hasMissingRequired(field);
      }
      return false;
    });

  const handlePropertyDataSubmit = async () => {
    if (!propertyData) return;

    if (hasMissingRequired(propertyData.listingData)) {
      setDataError('Please fill out all required fields.');
      return;
    }

    try {
      await fetch('/api/property-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyData),
      });
    } catch (err) {
      console.error('Failed to submit property data', err);
    }
  };

  async function getJSON(url: string) {
    try {
      const r = await fetch(`${url}${url.includes('?') ? '&' : '?'}ts=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) return null;
      const json = await r.json();
      setDataError(null);
      return json;
    } catch (err) {
      setDataError('Invalid response from server.');
      return null;
    }
  }

  const counties = [
    'Marion',
    'Harrison', 
    'Upshur',
    'Gregg',
    'Panola',
    'Smith'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (formState.error) {
      setFormState(prev => ({ ...prev, error: null }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.parcelId.trim()) {
      setFormState(prev => ({ ...prev, error: 'Parcel ID is required' }));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setFormState({
      isSubmitting: true,
      submitted: false,
      error: null,
      success: false
    });
    
    setIsWaitingForResults(true);
    setPropertyData(null);
    setSelectedId(null);

    const requestId = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) + Date.now().toString(36);
    setCurrentRequestId(requestId);

    try {
      const webhookUrl = 'https://public.lindy.ai/api/v1/webhooks/lindy/9f9ce9f4-c495-4f6e-90c6-d2bda80371b6';
      const webhookSecret = 'cb4eaa21207dccd8949f36889be59984ba7b44a69d5b3bda678f1e67dccc54ce';

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${webhookSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parcelId: formData.parcelId,
          address: formData.address || undefined,
          county: formData.county || undefined,
          state: formData.state || undefined,
          propertyType: formData.propertyType,
          requestId,
          callbackUrl: `${window.location.origin}/api/webhook-response`
        })
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      setFormState({
        isSubmitting: false,
        submitted: true,
        error: null,
        success: true
      });

      // Reset form after successful submission
      setFormData({
        parcelId: '',
        address: '',
        county: '',
        state: '',
        propertyType: 'Residential'
      });

    } catch (error) {
      setFormState({
        isSubmitting: false,
        submitted: true,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        success: false
      });
      setIsWaitingForResults(false);
    }
  };

  const handleClearResults = async () => {
    try {
      if (currentRequestId) {
        await fetch(`/api/webhook-response?requestId=${encodeURIComponent(currentRequestId)}`, { method: 'DELETE' });
      } else {
        await fetch('/api/webhook-response', { method: 'DELETE' });
      }
      setPropertyData(null);
      setIsWaitingForResults(false);
      setSelectedId(null);
      setCurrentRequestId(null);
      setDataError(null);

    } catch (error) {
      console.error('Error clearing results:', error);
    }
  };

  const refreshResults = async () => {
    try {
      if (!currentRequestId) return;
      const data = await getJSON(`/api/webhook-response?requestId=${encodeURIComponent(currentRequestId)}`);
      if (data && Object.keys(data).length > 0) {
        let safeData;
        try {
          safeData = JSON.parse(JSON.stringify(data));
        } catch (err) {
          console.warn('Data contains circular references, using original:', err);
          safeData = data;
        }
        setPropertyData(parsePropertyData(safeData));
        setIsWaitingForResults(false);
      }
    } catch (error) {
      console.error('Error refreshing results:', error);
      setIsWaitingForResults(false);
    }
  };

  const fetchHistory = async () => {
    const data = await getJSON('/api/history');
    if (Array.isArray(data)) setHistory(data);
  };

  const handleViewHistory = async (id: string) => {
    try {
      const data = await getJSON(`/api/history/${id}`);
      if (data && data.payload) {
        const payload = data.payload;

        let safePayload;
        try {
          safePayload = JSON.parse(JSON.stringify(payload));
        } catch (err) {
          console.warn('Payload contains circular references, using original:', err);
          safePayload = payload;
        }

        setPropertyData(parsePropertyData(safePayload));
        setSelectedId(id);
        setIsWaitingForResults(false);
        setCurrentRequestId(null);
      } else {
        console.warn('No payload found in history data:', data);
        setPropertyData(null);
      }
    } catch (error) {
      console.error('Error viewing history:', error);
      setPropertyData(null);
      setDataError('Failed to load historical data');
      setSelectedId(id);
      setIsWaitingForResults(false);
      setCurrentRequestId(null);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    await fetch(`/api/history/${id}`, { method: 'DELETE' });
    if (id === selectedId) {
      setSelectedId(null);
      setPropertyData(null);
    }
    fetchHistory();
  };

  // Poll for property data updates
  useEffect(() => {
    const checkForResults = async () => {
      const id = currentRequestId;
      if (!id) return;
      
      try {
        const data = await getJSON(`/api/webhook-response?requestId=${encodeURIComponent(id)}`);
        if (id !== currentRequestId) return; // request changed while fetching
        
        if (data && Object.keys(data).length > 0) {
          let safeData;
          try {
            safeData = JSON.parse(JSON.stringify(data));
          } catch (err) {
            console.warn('Polling data contains circular references, using original:', err);
            safeData = data;
          }
          setPropertyData(parsePropertyData(safeData));
          setIsWaitingForResults(false);
        }
      } catch (error) {
        console.error('Error checking for results:', error);
        if (id === currentRequestId) {
          setIsWaitingForResults(false);
        }
      }
    };

    let interval: NodeJS.Timeout;
    if (isWaitingForResults && currentRequestId) {
      checkForResults();
      interval = setInterval(checkForResults, 3000);
    }

    const onVisibility = () => {
      if (!document.hidden) {
        checkForResults();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isWaitingForResults, currentRequestId]);

  useEffect(() => {
    const load = () => {
      if (!document.hidden) {
        fetchHistory();
      }
    };
    load();
    const interval = setInterval(load, 10000);
    document.addEventListener('visibilitychange', load);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);
  const renderFields = (section: any, path: string[]): JSX.Element[] => {
    return Object.entries(section).map(([fieldKey, fieldValue]) => {
      const keyPath = path.concat(fieldKey).join('.');

      if (
        fieldValue &&
        typeof fieldValue === 'object' &&
        !Array.isArray(fieldValue) &&
        !('value' in fieldValue)
      ) {
        return (
          <div key={keyPath} className="col-span-1 md:col-span-2">
            <h4 className="text-md font-semibold text-gray-900 mt-2">
              {humanize(fieldKey)}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {renderFields(fieldValue, path.concat(fieldKey))}
            </div>
          </div>
        );
      }

      const rawValue =
        fieldValue && typeof fieldValue === 'object' && 'value' in fieldValue
          ? (fieldValue as ListingField).value
          : fieldValue;

      let displayValue = '';
      if (Array.isArray(rawValue)) displayValue = rawValue.join(', ');
      else if (typeof rawValue === 'boolean') displayValue = rawValue ? 'Yes' : 'No';
      else if (rawValue !== null && rawValue !== undefined)
        displayValue = String(rawValue);

      return (
        <div key={keyPath}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {humanize(fieldKey)}
          </label>
          <div className="text-gray-900">
            {displayValue === '' ? '-' : displayValue}
          </div>
        </div>
      );
    });
  };

  const renderSection = (key: string, section: any) => {
    const fields = section ? Object.entries(section) : [];
    return (
      <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200">
        <h3 className="px-6 py-4 font-semibold text-gray-900">{humanize(key)}</h3>
        {fields.length > 0 && (
          <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderFields(section, [key])}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Property Data Scraper
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Comprehensive property research and data collection service
          </p>
        </div>
        <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
          {/* Information Section */}
          <div className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-100">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              How it works:
            </h3>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-start">
                <span className="font-medium mr-2">•</span>
                Enter the property's parcel ID (required). Other fields are optional but help speed up research.
              </li>
              <li className="flex items-start">
                <span className="font-medium mr-2">•</span>
                Results will appear below automatically once the research is complete.
              </li>
              <li className="flex items-start">
                <span className="font-medium mr-2">•</span>
                The system will research comprehensive property details including square footage, lot size, owner info, assessed values, zoning, and commercial data.
              </li>
            </ul>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Parcel ID */}
            <div>
              <label htmlFor="parcelId" className="block text-sm font-semibold text-gray-700 mb-2">
                Parcel ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="parcelId"
                name="parcelId"
                value={formData.parcelId}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter parcel ID (e.g., 123-456-789)"
                required
              />
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
                Address <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter property address"
              />
            </div>

            {/* County */}
            <div>
              <label htmlFor="county" className="block text-sm font-semibold text-gray-700 mb-2">
                County <span className="text-gray-400">(Optional)</span>
              </label>
              <select
                id="county"
                name="county"
                value={formData.county}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="">Select a county...</option>
                {counties.map(county => (
                  <option key={county} value={county}>{county}</option>
                ))}
              </select>
            </div>

            {/* State */}
            <div>
              <label htmlFor="state" className="block text-sm font-semibold text-gray-700 mb-2">
                State <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter state (e.g., TX)"
              />
            </div>

            {/* Property Type */}
            <div>
              <label htmlFor="propertyType" className="block text-sm font-semibold text-gray-700 mb-2">
                Property Type
              </label>
              <select
                id="propertyType"
                name="propertyType"
                value={formData.propertyType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="Residential">Residential</option>
                <option value="Land">Land</option>
              </select>
            </div>

            {/* Error Message */}
            {formState.error && (
              <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                <span className="text-red-700">{formState.error}</span>
              </div>
            )}

            {/* Success Message */}
            {formState.success && (
              <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-green-700">
                  Research request submitted successfully! Results will appear below once complete.
                </span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={formState.isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {formState.isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting Research Request...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Start Property Research</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <button type="button" onClick={refreshResults} className="text-sm text-blue-600 hover:underline">Refresh Results</button>
          <button type="button" onClick={handleClearResults} className="text-sm text-blue-600 hover:underline">Clear Results</button>
          <button type="button" onClick={fetchHistory} className="text-sm text-blue-600 hover:underline">Refresh History</button>
        </div>

        {/* History Panel */}
        <div className="mt-8 bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Past Searches</h2>
            <button onClick={fetchHistory} className="text-sm text-blue-600 hover:underline">Refresh History</button>
          </div>
          {history.length === 0 ? (
            <p className="text-gray-500">No past searches</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="px-2 py-1">Date/Time</th>
                    <th className="px-2 py-1">Parcel ID</th>
                    <th className="px-2 py-1">County/State</th>
                    <th className="px-2 py-1">Summary</th>
                    <th className="px-2 py-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(item => (
                    <tr key={item.id} className={selectedId === item.id ? 'bg-gray-50' : ''}>
                      <td className="px-2 py-1">{new Date(item.createdAt).toLocaleString()}</td>
                      <td className="px-2 py-1">{item.parcelId || '-'}</td>
                      <td className="px-2 py-1">{[item.county, item.state].filter(Boolean).join(', ')}</td>
                      <td className="px-2 py-1">{item.summary || '-'}</td>
                      <td className="px-2 py-1 space-x-2">
                        <button onClick={() => handleViewHistory(item.id)} className="text-blue-600 hover:underline">View</button>
                        <button onClick={() => handleDeleteHistory(item.id)} className="text-red-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Property Data Results */}
        {isWaitingForResults && (
          <div className="mt-8 bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Property Research</h2>
              <p className="text-gray-600">
                Our system is gathering comprehensive property data. This may take a few minutes...
              </p>
              <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Estimated time: 5-10 minutes</span>
              </div>
            </div>
          </div>
        )}

        {dataError && !propertyData && (
          <div className="mt-8 text-red-600">{dataError}</div>
        )}

        {propertyData && (
          <div className="mt-8 bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Property Research Results</h2>
              <button
                onClick={handleClearResults}
                className="text-sm text-blue-600 hover:underline"
              >
                Clear results
              </button>
            </div>
            {dataError && (
              <div className="text-red-600 mb-4">{dataError}</div>
            )}
            <div className="space-y-4">
              {Object.entries(propertyData.listingData).map(([key, section]) =>
                renderSection(key, section)
              )}
            </div>
            <div className="mt-6 flex flex-col space-y-4">
              <button
                onClick={handlePropertyDataSubmit}
                className="self-start bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Save Changes
              </button>
              {propertyData._receivedAt && (
                <div className="text-sm text-gray-500">
                  Received at: {propertyData._receivedAt}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Secure property data research powered by professional data sources</p>
        </div>
      </div>
    </div>
  );
}

export default App;
