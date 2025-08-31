'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Loader2,
  Heart,
  AlertCircle,
  CheckCircle,
  User,
  Phone,
  Mail,
  MapPin,
  Shield,
  Stethoscope,
  UserPlus,
  Calendar,
  IdCard,
  Building,
  Users,
  X,
  Save,
  Sparkles
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

interface Props {
  open: boolean;
  onClose: () => void;
}

type PatientForm = {
  first_name: string;
  last_name: string;
  gender: 'Male' | 'Female' | '';
  dob: string;
  ethnicity: string;
  phone: string;
  email: string;
  marital_status: string;
  occupation: string;
  insurance_provider: string;
  address: string;
  weight: string;
  height: string;
};

export function CreatePatientModal({ open, onClose }: Props) {
  const { getAccessTokenSilently } = useAuth0();

  const [form, setForm] = useState<PatientForm>({
    first_name: '',
    last_name: '',
    gender: '',
    dob: '',
    ethnicity: '',
    phone: '',
    email: '',
    marital_status: '',
    occupation: '',
    insurance_provider: '',
    address: '',
    weight: '',
    height: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (name: keyof PatientForm, value: string) => {
    setForm({ ...form, [name]: value });
    if (error) setError('');
    if (success) setSuccess(false);
  };

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name || !form.gender || !form.dob) {
      setError('First Name, Last Name, Gender, and Date of Birth are required.');
      return;
    }

    try {
      setLoading(true);
      const token = await getAccessTokenSilently();
      const res = await fetch(`${API}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          weight: form.weight ? parseInt(form.weight) : 70,
          height: form.height ? parseInt(form.height) : 170,
          smoke: 0,
          alco: 0,
          active: 1,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      setSuccess(true);
      setForm({
        first_name: '',
        last_name: '',
        gender: '',
        dob: '',
        ethnicity: '',
        phone: '',
        email: '',
        marital_status: '',
        occupation: '',
        insurance_provider: '',
        address: '',
        weight: '',
        height: '',
      });

      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      setError('Unable to create patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setError('');
      setSuccess(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[95vh] max-w-6xl flex flex-col rounded-2xl bg-white p-0 shadow-2xl border-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Create New Patient Record</DialogTitle>
          <DialogDescription>
            Add a new patient to the healthcare system
          </DialogDescription>
        </DialogHeader>

        {/* Compact Professional Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 overflow-hidden flex-shrink-0">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-8 w-16 h-16 border border-white rounded-full animate-pulse"></div>
            <div className="absolute top-6 right-8 w-12 h-12 border border-white rounded-full"></div>
            <div className="absolute bottom-4 left-1/3 w-10 h-10 bg-white rounded-full opacity-30"></div>
          </div>
          
          <div className="relative px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-3 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20">
                  <UserPlus className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-bold tracking-tight">Create New Patient</h2>
                <p className="text-blue-100 text-sm">Advanced Cardiovascular Care System</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-6 py-6 space-y-6">
              
            {/* Professional Multi-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column - Demographics & Contact */}
              <div className="space-y-6">
                  
                  {/* Demographics Card */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <IdCard className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Demographics</h3>
                          <p className="text-sm text-gray-600">Patient identification details</p>
                        </div>
                        <div className="ml-auto">
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                            Required
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                            First Name *
                          </label>
                          <input
                            id="first_name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="John"
                            value={form.first_name}
                            onChange={(e) => handleChange('first_name', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name *
                          </label>
                          <input
                            id="last_name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Doe"
                            value={form.last_name}
                            onChange={(e) => handleChange('last_name', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                            Gender *
                          </label>
                          <select
                            id="gender"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                            value={form.gender}
                            onChange={(e) => handleChange('gender', e.target.value as PatientForm['gender'])}
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                        
                        <div>
                          <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">
                            Date of Birth *
                          </label>
                          <input
                            id="dob"
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            value={form.dob}
                            onChange={(e) => handleChange('dob', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="ethnicity" className="block text-sm font-medium text-gray-700 mb-1">
                          Ethnicity
                        </label>
                        <input
                          id="ethnicity"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Optional"
                          value={form.ethnicity}
                          onChange={(e) => handleChange('ethnicity', e.target.value)}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                            Weight (kg)
                          </label>
                          <input
                            id="weight"
                            type="number"
                            min="1"
                            max="1000"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="70"
                            value={form.weight}
                            onChange={(e) => handleChange('weight', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                            Height (cm)
                          </label>
                          <input
                            id="height"
                            type="number"
                            min="1"
                            max="250"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="170"
                            value={form.height}
                            onChange={(e) => handleChange('height', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information Card */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Phone className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                          <p className="text-sm text-gray-600">Patient contact details</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number
                          </label>
                          <input
                            id="phone"
                            type="tel"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                            placeholder="+1 (555) 123-4567"
                            value={form.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address
                          </label>
                          <input
                            id="email"
                            type="email"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                            placeholder="john.doe@example.com"
                            value={form.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                          Home Address
                        </label>
                        <textarea
                          id="address"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors h-20 resize-none"
                          placeholder="123 Main Street, City, State, ZIP Code"
                          value={form.address}
                          onChange={(e) => handleChange('address', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

              {/* Right Column - Social & Insurance */}
              <div>
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Building className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Social & Insurance</h3>
                        <p className="text-sm text-gray-600">Additional patient information</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div>
                      <label htmlFor="marital_status" className="block text-sm font-medium text-gray-700 mb-1">
                        Marital Status
                      </label>
                      <select
                        id="marital_status"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white"
                        value={form.marital_status}
                        onChange={(e) => handleChange('marital_status', e.target.value)}
                      >
                        <option value="">Select Status</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-1">
                        Occupation
                      </label>
                      <input
                        id="occupation"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="e.g., Software Engineer, Teacher"
                        value={form.occupation}
                        onChange={(e) => handleChange('occupation', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="insurance_provider" className="block text-sm font-medium text-gray-700 mb-1">
                        Insurance Provider
                      </label>
                      <input
                        id="insurance_provider"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                        placeholder="e.g., Blue Cross Blue Shield, Aetna"
                        value={form.insurance_provider}
                        onChange={(e) => handleChange('insurance_provider', e.target.value)}
                      />
                    </div>

                  </div>
                </div>
              </div>
            </div>
            
            {/* Add some bottom padding to ensure content doesn't get cut off */}
            <div className="h-4"></div>
          </div>
        </div>



        {/* Status Messages */}
        {(error || success) && (
          <div className="px-6 py-3 border-t border-gray-100 flex-shrink-0">
            {error && (
              <div className="flex items-center gap-3 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-3 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">Patient created successfully!</span>
              </div>
            )}
          </div>
        )}

        {/* Professional Action Bar - Always Visible Footer */}
        <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-1">
                <Stethoscope className="w-3 h-3" />
                <span>Medical Grade</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
              >
                Cancel
              </Button>
              
              <Button
                onClick={handleSubmit}
                disabled={loading || success}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Patient
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePatientModal;