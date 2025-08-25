import React, { useState } from 'react';

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border rounded-lg mb-4">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex justify-between items-center p-3 bg-gray-100"
      >
        <span className="font-medium">{title}</span>
        <span>{open ? '−' : '+'}</span>
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

const applianceOptions = ['Dishwasher', 'Disposal', 'Microwave'];
const lotFeatureOptions = ['Corner Lot', 'Cul-De-Sac'];
const exteriorFeatureOptions = ['Balcony', 'Rain Gutters'];
const presentUseOptions = ['Residential', 'Commercial'];
const utilityOptions = ['Electric', 'Water'];

export default function PropertyInputForm() {
  const [propertyType, setPropertyType] = useState<'Residential' | 'Land'>('Residential');

  const [residential, setResidential] = useState({
    propertyInformation: { streetAddress: '', city: '', listPrice: '' },
    roomDetails: { bedrooms: '', bathrooms: '' },
    featuresInfo: { appliances: [] as string[], exteriorFeatures: [] as string[] },
    lotInfo: { lotSize: '', lotFeatures: [] as string[] },
    utilityInfo: { utilities: [] as string[] },
    environmentInfo: { energyEfficient: '' },
    financialInfo: { taxAnnualAmount: '', financingProposed: '' },
    hoaInfo: { hoaFee: '', hoaFeeFrequency: '' },
    agentOfficeInfo: { listingAgent: '', listingOffice: '' },
    showingInfo: { showingInstructions: '' },
    remarks: '',
    condoFarmRanch: { condoName: '' },
  });

  const [land, setLand] = useState({
    propertyInformation: { streetAddress: '', city: '', listPrice: '' },
    lotInfo: { lotSize: '', lotFeatures: [] as string[], presentUse: [] as string[] },
    utilityInfo: { utilities: [] as string[] },
    financialInfo: { taxAnnualAmount: '', financingProposed: '' },
    hoaInfo: { hoaFee: '', hoaFeeFrequency: '' },
    agentOfficeInfo: { listingAgent: '', listingOffice: '' },
    showingRequirements: { showingInstructions: '' },
    remarks: '',
  });

  const handleChange = (
    type: 'Residential' | 'Land',
    section: string,
    field: string,
    value: string
  ) => {
    if (type === 'Residential') {
      setResidential(prev => ({
        ...prev,
        [section]: { ...prev[section as keyof typeof prev], [field]: value },
      }));
    } else {
      setLand(prev => ({
        ...prev,
        [section]: { ...prev[section as keyof typeof prev], [field]: value },
      }));
    }
  };

  const handleCheckbox = (
    type: 'Residential' | 'Land',
    section: string,
    field: string,
    option: string
  ) => {
    if (type === 'Residential') {
      setResidential(prev => {
        const arr = (prev as any)[section][field] as string[];
        const exists = arr.includes(option);
        const newArr = exists ? arr.filter(v => v !== option) : [...arr, option];
        return { ...prev, [section]: { ...prev[section as keyof typeof prev], [field]: newArr } };
      });
    } else {
      setLand(prev => {
        const arr = (prev as any)[section][field] as string[];
        const exists = arr.includes(option);
        const newArr = exists ? arr.filter(v => v !== option) : [...arr, option];
        return { ...prev, [section]: { ...prev[section as keyof typeof prev], [field]: newArr } };
      });
    }
  };

  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { propertyType };
    if (propertyType === 'Residential') {
      Object.assign(payload, {
        property_information: residential.propertyInformation,
        room_details: residential.roomDetails,
        features_info: residential.featuresInfo,
        lot_info: residential.lotInfo,
        utility_info: residential.utilityInfo,
        environment_info: residential.environmentInfo,
        financial_info: residential.financialInfo,
        hoa_info: residential.hoaInfo,
        agent_office_info: residential.agentOfficeInfo,
        showing_info: residential.showingInfo,
        remarks: residential.remarks,
        condo_farm_ranch: residential.condoFarmRanch,
      });
    } else {
      Object.assign(payload, {
        property_information: land.propertyInformation,
        lot_info: land.lotInfo,
        utility_info: land.utilityInfo,
        financial_info: land.financialInfo,
        hoa_info: land.hoaInfo,
        agent_office_info: land.agentOfficeInfo,
        showing_requirements: land.showingRequirements,
        remarks: land.remarks,
      });
    }

    try {
      const res = await fetch('/api/webhook-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Request failed');
      setSubmitStatus('Submitted successfully');
    } catch (err) {
      setSubmitStatus('Submission failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">
          Property Type <span className="text-red-500">*</span>
        </label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={propertyType}
          onChange={e => setPropertyType(e.target.value as 'Residential' | 'Land')}
          required
        >
          <option value="Residential">Residential</option>
          <option value="Land">Land</option>
        </select>
      </div>

      {propertyType === 'Residential' && (
        <>
          <CollapsibleSection title="Property Information">
            <div>
              <label className="block mb-1">Street Address <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={residential.propertyInformation.streetAddress}
                onChange={e => handleChange('Residential', 'propertyInformation', 'streetAddress', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block mb-1">City <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={residential.propertyInformation.city}
                onChange={e => handleChange('Residential', 'propertyInformation', 'city', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block mb-1">List Price <span className="text-red-500">*</span></label>
              <input
                type="number"
                className="border rounded px-3 py-2 w-full"
                value={residential.propertyInformation.listPrice}
                onChange={e => handleChange('Residential', 'propertyInformation', 'listPrice', e.target.value)}
                required
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Room Details">
            <div>
              <label className="block mb-1">Bedrooms</label>
              <input
                type="number"
                className="border rounded px-3 py-2 w-full"
                value={residential.roomDetails.bedrooms}
                onChange={e => handleChange('Residential', 'roomDetails', 'bedrooms', e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1">Bathrooms</label>
              <input
                type="number"
                className="border rounded px-3 py-2 w-full"
                value={residential.roomDetails.bathrooms}
                onChange={e => handleChange('Residential', 'roomDetails', 'bathrooms', e.target.value)}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Features Info">
            <div>
              <label className="block mb-1">Appliances</label>
              <div className="flex flex-wrap gap-2">
                {applianceOptions.map(opt => (
                  <label key={opt} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={residential.featuresInfo.appliances.includes(opt)}
                      onChange={() => handleCheckbox('Residential', 'featuresInfo', 'appliances', opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block mb-1">Exterior Features</label>
              <div className="flex flex-wrap gap-2">
                {exteriorFeatureOptions.map(opt => (
                  <label key={opt} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={residential.featuresInfo.exteriorFeatures.includes(opt)}
                      onChange={() => handleCheckbox('Residential', 'featuresInfo', 'exteriorFeatures', opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Lot Info">
            <div>
              <label className="block mb-1">Lot Size</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={residential.lotInfo.lotSize}
                onChange={e => handleChange('Residential', 'lotInfo', 'lotSize', e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1">Lot Features</label>
              <div className="flex flex-wrap gap-2">
                {lotFeatureOptions.map(opt => (
                  <label key={opt} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={residential.lotInfo.lotFeatures.includes(opt)}
                      onChange={() => handleCheckbox('Residential', 'lotInfo', 'lotFeatures', opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Utility Info">
            <div>
              <label className="block mb-1">Utilities</label>
              <div className="flex flex-wrap gap-2">
                {utilityOptions.map(opt => (
                  <label key={opt} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={residential.utilityInfo.utilities.includes(opt)}
                      onChange={() => handleCheckbox('Residential', 'utilityInfo', 'utilities', opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Environment Info">
            <div>
              <label className="block mb-1">Energy Efficient</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={residential.environmentInfo.energyEfficient}
                onChange={e => handleChange('Residential', 'environmentInfo', 'energyEfficient', e.target.value)}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Financial Info">
            <div>
              <label className="block mb-1">Annual Taxes</label>
              <input
                type="number"
                className="border rounded px-3 py-2 w-full"
                value={residential.financialInfo.taxAnnualAmount}
                onChange={e => handleChange('Residential', 'financialInfo', 'taxAnnualAmount', e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1">Financing Proposed</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={residential.financialInfo.financingProposed}
                onChange={e => handleChange('Residential', 'financialInfo', 'financingProposed', e.target.value)}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="HOA Info">
            <div>
              <label className="block mb-1">HOA Fee</label>
              <input
                type="number"
                className="border rounded px-3 py-2 w-full"
                value={residential.hoaInfo.hoaFee}
                onChange={e => handleChange('Residential', 'hoaInfo', 'hoaFee', e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1">HOA Fee Frequency</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={residential.hoaInfo.hoaFeeFrequency}
                onChange={e => handleChange('Residential', 'hoaInfo', 'hoaFeeFrequency', e.target.value)}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Agent/Office Info">
            <div>
              <label className="block mb-1">Listing Agent</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={residential.agentOfficeInfo.listingAgent}
                onChange={e => handleChange('Residential', 'agentOfficeInfo', 'listingAgent', e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1">Listing Office</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={residential.agentOfficeInfo.listingOffice}
                onChange={e => handleChange('Residential', 'agentOfficeInfo', 'listingOffice', e.target.value)}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Showing Info">
            <div>
              <label className="block mb-1">Showing Instructions</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={residential.showingInfo.showingInstructions}
                onChange={e => handleChange('Residential', 'showingInfo', 'showingInstructions', e.target.value)}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Remarks">
            <div>
              <label className="block mb-1">Public Remarks</label>
              <textarea
                className="border rounded px-3 py-2 w-full"
                value={residential.remarks}
                onChange={e => setResidential(prev => ({ ...prev, remarks: e.target.value }))}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Condo/Farm & Ranch">
            <div>
              <label className="block mb-1">Condo Name</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={residential.condoFarmRanch.condoName}
                onChange={e => handleChange('Residential', 'condoFarmRanch', 'condoName', e.target.value)}
              />
            </div>
          </CollapsibleSection>
        </>
      )}

      {propertyType === 'Land' && (
        <>
          <CollapsibleSection title="Property Information">
            <div>
              <label className="block mb-1">Street Address <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={land.propertyInformation.streetAddress}
                onChange={e => handleChange('Land', 'propertyInformation', 'streetAddress', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block mb-1">City <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={land.propertyInformation.city}
                onChange={e => handleChange('Land', 'propertyInformation', 'city', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block mb-1">List Price <span className="text-red-500">*</span></label>
              <input
                type="number"
                className="border rounded px-3 py-2 w-full"
                value={land.propertyInformation.listPrice}
                onChange={e => handleChange('Land', 'propertyInformation', 'listPrice', e.target.value)}
                required
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Lot Info">
            <div>
              <label className="block mb-1">Lot Size</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={land.lotInfo.lotSize}
                onChange={e => handleChange('Land', 'lotInfo', 'lotSize', e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1">Lot Features</label>
              <div className="flex flex-wrap gap-2">
                {lotFeatureOptions.map(opt => (
                  <label key={opt} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={land.lotInfo.lotFeatures.includes(opt)}
                      onChange={() => handleCheckbox('Land', 'lotInfo', 'lotFeatures', opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block mb-1">Present/Proposed Use</label>
              <div className="flex flex-wrap gap-2">
                {presentUseOptions.map(opt => (
                  <label key={opt} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={land.lotInfo.presentUse.includes(opt)}
                      onChange={() => handleCheckbox('Land', 'lotInfo', 'presentUse', opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Utility Info">
            <div>
              <label className="block mb-1">Utilities</label>
              <div className="flex flex-wrap gap-2">
                {utilityOptions.map(opt => (
                  <label key={opt} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={land.utilityInfo.utilities.includes(opt)}
                      onChange={() => handleCheckbox('Land', 'utilityInfo', 'utilities', opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Financial Info">
            <div>
              <label className="block mb-1">Annual Taxes</label>
              <input
                type="number"
                className="border rounded px-3 py-2 w-full"
                value={land.financialInfo.taxAnnualAmount}
                onChange={e => handleChange('Land', 'financialInfo', 'taxAnnualAmount', e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1">Financing Proposed</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={land.financialInfo.financingProposed}
                onChange={e => handleChange('Land', 'financialInfo', 'financingProposed', e.target.value)}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="HOA Info">
            <div>
              <label className="block mb-1">HOA Fee</label>
              <input
                type="number"
                className="border rounded px-3 py-2 w-full"
                value={land.hoaInfo.hoaFee}
                onChange={e => handleChange('Land', 'hoaInfo', 'hoaFee', e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1">HOA Fee Frequency</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={land.hoaInfo.hoaFeeFrequency}
                onChange={e => handleChange('Land', 'hoaInfo', 'hoaFeeFrequency', e.target.value)}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Agent/Office Info">
            <div>
              <label className="block mb-1">Listing Agent</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={land.agentOfficeInfo.listingAgent}
                onChange={e => handleChange('Land', 'agentOfficeInfo', 'listingAgent', e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1">Listing Office</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={land.agentOfficeInfo.listingOffice}
                onChange={e => handleChange('Land', 'agentOfficeInfo', 'listingOffice', e.target.value)}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Showing Requirements">
            <div>
              <label className="block mb-1">Showing Instructions</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={land.showingRequirements.showingInstructions}
                onChange={e => handleChange('Land', 'showingRequirements', 'showingInstructions', e.target.value)}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Remarks">
            <div>
              <label className="block mb-1">Public Remarks</label>
              <textarea
                className="border rounded px-3 py-2 w-full"
                value={land.remarks}
                onChange={e => setLand(prev => ({ ...prev, remarks: e.target.value }))}
              />
            </div>
          </CollapsibleSection>
        </>
      )}

      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Submit
      </button>
      {submitStatus && <p className="text-sm mt-2">{submitStatus}</p>}
    </form>
  );
}

