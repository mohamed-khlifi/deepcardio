import { useAuth0 } from '@auth0/auth0-react';
import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

// Custom fetcher with auth
export const useApiRequest = () => {
  const { getAccessTokenSilently } = useAuth0();
  
  const fetcher = useCallback(async (url: string) => {
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${API}${url}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`HTTP ${response.status}: ${errorText}`);
        console.error('API Error:', error.message);
        throw error;
      }
      
      return response.json();
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }, [getAccessTokenSilently]);

  const postData = useCallback(async (url: string, data: any) => {
    const token = await getAccessTokenSilently();
    const response = await fetch(`${API}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }, [getAccessTokenSilently]);

  const putData = useCallback(async (url: string, data: any) => {
    const token = await getAccessTokenSilently();
    const response = await fetch(`${API}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }, [getAccessTokenSilently]);

  const deleteData = useCallback(async (url: string) => {
    const token = await getAccessTokenSilently();
    const response = await fetch(`${API}${url}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.ok;
  }, [getAccessTokenSilently]);

  return { fetcher, postData, putData, deleteData };
};

// Custom hooks for common API calls
export const usePatient = (patientId: string | number | null) => {
  const { fetcher } = useApiRequest();
  return useSWR(patientId ? `/patients/${patientId}` : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // 30 seconds
  });
};

export const usePatients = () => {
  const { fetcher } = useApiRequest();
  return useSWR('/patients', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  });
};

export const usePersonalHistoryDict = () => {
  const { fetcher } = useApiRequest();
  return useSWR('/personal-history/dict', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 minutes - dict rarely changes
  });
};

export const usePatientPersonalHistory = (patientId: string | number | null) => {
  const { fetcher } = useApiRequest();
  return useSWR(
    patientId ? `/personal-history/by-patient/${patientId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );
};

export const useSymptomDict = () => {
  const { fetcher } = useApiRequest();
  return useSWR('/symptoms/dict', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 minutes
  });
};

export const useVitalSignsDict = () => {
  const { fetcher } = useApiRequest();
  return useSWR('/vital-signs/dict', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 minutes
  });
};

export const useTestsDict = () => {
  const { fetcher } = useApiRequest();
  return useSWR('/tests/dict', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 minutes
  });
};

// Patient-specific data hooks
export const usePatientSymptoms = (patientId: string | number | null) => {
  const { fetcher } = useApiRequest();
  return useSWR(patientId ? `/symptoms/by-patient/${patientId}` : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  });
};

export const usePatientVitalSigns = (patientId: string | number | null) => {
  const { fetcher } = useApiRequest();
  return useSWR(patientId ? `/vital-signs/by-patient/${patientId}` : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  });
};

export const usePatientTests = (patientId: string | number | null) => {
  const { fetcher } = useApiRequest();
  return useSWR(patientId ? `/tests/by-patient/${patientId}` : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  });
};

// Summary section hooks - use dedicated endpoints for real patient_* table data
export const usePatientFollowUpActions = (patientId: string | number | null) => {
  const { fetcher } = useApiRequest();
  return useSWR(patientId ? `/follow-up-actions/by-patient/${patientId}` : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // 30 seconds
  });
};

export const usePatientRecommendations = (patientId: string | number) => {
  const { fetcher } = useApiRequest();
  return useSWR(patientId ? `/patient-recommendations/by-patient/${patientId}` : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // 30 seconds
  });
};

export const usePatientReferrals = (patientId: string | number) => {
  const { fetcher } = useApiRequest();
  return useSWR(patientId ? `/patient-referrals/by-patient/${patientId}` : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // 30 seconds
  });
};

export const usePatientLifestyleAdvices = (patientId: string | number) => {
  const { fetcher } = useApiRequest();
  return useSWR(patientId ? `/patient-lifestyle-advices/by-patient/${patientId}` : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // 30 seconds
  });
};

export const usePatientPresumptiveDiagnoses = (patientId: string | number) => {
  const { fetcher } = useApiRequest();
  return useSWR(patientId ? `/patient-presumptive-diagnoses/by-patient/${patientId}` : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // 30 seconds
  });
};

export const usePatientTestsToOrder = (patientId: string | number) => {
  const { fetcher } = useApiRequest();
  return useSWR(patientId ? `/patient-tests-to-order/by-patient/${patientId}` : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // 30 seconds
  });
};

export const usePatientAuditLogs = (patientId: string | number) => {
  const { fetcher } = useApiRequest();
  return useSWR(patientId ? `/audit-logs?patient_id=${patientId}` : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 15000, // 15 seconds (more frequent for logs)
  });
};

// Cache invalidation helpers
export const invalidatePatientCache = (patientId: string | number) => {
  mutate(`/patients/${patientId}`);
  mutate(`/patients/${patientId}?basic=true`);
  mutate(`/patients/${patientId}?basic=false`);
  mutate(`/personal-history/by-patient/${patientId}`);
  mutate(`/symptoms/by-patient/${patientId}`);
  mutate(`/vital-signs/by-patient/${patientId}`);
  mutate(`/tests/by-patient/${patientId}`);
};

export const invalidatePatientSummaryCache = (patientId: string | number) => {
  // Invalidate all dedicated patient_* table endpoints
  mutate(`/follow-up-actions/by-patient/${patientId}`);
  mutate(`/patient-recommendations/by-patient/${patientId}`);
  mutate(`/patient-referrals/by-patient/${patientId}`);
  mutate(`/patient-lifestyle-advices/by-patient/${patientId}`);
  mutate(`/patient-presumptive-diagnoses/by-patient/${patientId}`);
  mutate(`/patient-tests-to-order/by-patient/${patientId}`);
  // Also invalidate the main patient endpoint to refresh summary data (both with and without query params)
  mutate(`/patients/${patientId}`);
  mutate(`/patients/${patientId}?basic=true`);
  mutate(`/patients/${patientId}?basic=false`);
};

export const invalidateAllPatientData = (patientId: string | number) => {
  invalidatePatientCache(patientId);
  invalidatePatientSummaryCache(patientId);
  mutate(`/audit-logs?patient_id=${patientId}`);
};

export const invalidatePatientsCache = () => {
  mutate('/patients');
};
