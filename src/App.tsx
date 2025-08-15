import React, { useState, useEffect } from 'react';
import { Send, CheckCircle, XCircle, Loader2, Home, DollarSign, Building, MapPin, FileText, Clock } from 'lucide-react';

interface FormData {
  parcelId: string;
  address: string;
  county: string;
  state: string;
}

interface FormState {
  isSubmitting: boolean;
  submitted: boolean;
  error: string | null;
  success: boolean;
}

interface PropertyData {
  property_basics?: {
    address?: string;
    parcel_id?: string;
    square_footage?: string;
    lot_size?: string;
    year_built?: string;
    property_type?: string;
    [key: string]: any;
  };
  assessed_value_info?: {
    current_assessed_value?: string;
    land_value?: string;
    improvement_value?: string;
    total_value?: string;
    [key: string]: any;
  };
  commercial_details?: {
    cap_rate?: string;
    noi?: string;
    rental_income?: string;
    operating_expenses?: string;
    [key: string]: any;
  };
  owner_information?: {
    owner_name?: string;
    mailing_address?: string;
    ownership_type?: string;
    [key: string]: any;
  };
  zoning_info?: {
    zoning_classification?: string;
    land_use?: string;
    restrictions?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

function App() {
  const [formData, setFormData] = useState<FormData>({
    parcelId: '',
    address: '',
    county: '',
    state: ''
  });

  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    submitted: false,
    error: null,
    success: false
  });

  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [isWaitingForResults, setIsWaitingForResults] = useState(false);

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

    try {
      const webhookUrl = 'https://public.lindy.ai/api/v1/webhooks/lindy/bd98b1a4-c701-4188-a1da-6591410e2cc0';
      const webhookSecret = '2750c563c10c33aebf1bb69a20f5b46d7ee33abf85e357eabb92659d5d9b7250';

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
        state: ''
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

  // Poll for property data updates
  useEffect(() => {
    const checkForResults = async () => {
      try {
        const response = await fetch('/api/webhook-response');
        if (response.ok) {
          const data = await response.json();
          if (data && Object.keys(data).length > 0) {
            setPropertyData(data);
            setIsWaitingForResults(false);
          }
        }
      } catch (error) {
        console.error('Error checking for results:', error);
      }
    };

    let interval: NodeJS.Timeout;
    if (isWaitingForResults) {
      interval = setInterval(checkForResults, 3000); // Check every 3 seconds when waiting
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWaitingForResults]);

  const formatPropertySection = (title: string, data: any, icon: React.ReactNode) => {
    if (!data || Object.keys(data).length === 0) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-blue-100 rounded-lg mr-3">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="bg-gray-50 p-3 rounded-lg">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </dt>
              <dd className="text-sm font-medium text-gray-900">
                {value || 'Not available'}
              </dd>
            </div>
          ))}
        </div>
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
                <span>Estimated time: 2-5 minutes</span>
              </div>
            </div>
          </div>
        )}

        {propertyData && (
          <div className="mt-8 bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Property Research Results</h2>
            <div className="space-y-6">
              {formatPropertySection(
                'Property Basics',
                propertyData.property_basics,
                <Home className="w-5 h-5 text-blue-600" />
              )}
              
              {formatPropertySection(
                'Assessed Value Information',
                propertyData.assessed_value_info,
                <DollarSign className="w-5 h-5 text-blue-600" />
              )}
              
              {formatPropertySection(
                'Commercial Details',
                propertyData.commercial_details,
                <Building className="w-5 h-5 text-blue-600" />
              )}
              
              {formatPropertySection(
                'Owner Information',
                propertyData.owner_information,
                <FileText className="w-5 h-5 text-blue-600" />
              )}
              
              {formatPropertySection(
                'Zoning Information',
                propertyData.zoning_info,
                <MapPin className="w-5 h-5 text-blue-600" />
              )}
              
              {/* Display any additional sections that weren't specifically handled */}
              {Object.entries(propertyData).map(([key, value]) => {
                if (!['property_basics', 'assessed_value_info', 'commercial_details', 'owner_information', 'zoning_info'].includes(key) && 
                    value && typeof value === 'object' && Object.keys(value).length > 0) {
                  return formatPropertySection(
                    key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    value,
                    <FileText className="w-5 h-5 text-blue-600" />
                  );
                }
                return null;
              })}
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