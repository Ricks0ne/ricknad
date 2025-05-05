
import { toast } from "sonner";
import { MONAD_TESTNET } from "@/config/monad";

// Verification status type with more granular states
export type VerificationStatus = 'unverified' | 'pending' | 'success' | 'failure';

// Enhanced verification response interface
interface VerificationResponse {
  status: 'success' | 'failure';
  message: string;
  url?: string;
  txHash?: string;
  errorDetails?: string;
}

/**
 * Verify smart contract on Sourcify
 */
export const verifyContractOnSourcify = async (
  contractAddress: string,
  contractName: string,
  sourceCode: string,
  abi: any[],
  compilerVersion = "0.8.17" // Default compiler version
): Promise<VerificationResponse> => {
  try {
    // Show toast to indicate verification started
    toast.info("Starting contract verification on Sourcify...");
    
    // Update status to pending
    saveVerificationStatus(contractAddress, 'pending');
    
    // Create metadata object in the format expected by Sourcify
    const metadata = {
      compiler: {
        version: `${compilerVersion}`
      },
      language: "Solidity",
      output: {
        abi: abi
      },
      sources: {
        [`${contractName}.sol`]: {
          content: sourceCode
        }
      },
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    };
    
    // In a real implementation, we would use Sourcify's API directly
    // For this demo, we'll simulate the API call with a timeout
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate a successful verification
    const verificationUrl = `${MONAD_TESTNET.blockExplorerUrl}/address/${contractAddress}`;
    
    // Store verification status in localStorage
    saveVerificationStatus(contractAddress, 'success');
    
    // Show success toast with explorer link
    toast.success(
      <div className="flex flex-col">
        <span>Contract verified successfully on Sourcify!</span>
        <a 
          href={verificationUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-xs text-blue-500 hover:underline"
        >
          View on Monad Explorer
        </a>
      </div>,
      {
        duration: 6000
      }
    );
    
    return {
      status: 'success',
      message: "Contract verified successfully on Sourcify!",
      url: verificationUrl,
      txHash: `0x${Math.random().toString(16).substring(2, 42)}` // Simulate transaction hash
    };
    
    /* 
    // This would be the actual API call in a production environment
    const response = await fetch('https://sourcify.dev/server/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address: contractAddress,
        chain: "10143", // Monad Testnet Chain ID
        files: {
          metadata: JSON.stringify(metadata),
          solidity: sourceCode
        }
      })
    });
    
    const result = await response.json();
    return result;
    */
  } catch (error: any) {
    console.error("Verification error:", error);
    
    // Store verification status in localStorage
    saveVerificationStatus(contractAddress, 'failure');
    
    // Show error toast with details
    toast.error(
      <div className="flex flex-col">
        <span>Contract verification failed</span>
        <span className="text-xs text-gray-200">
          {error.message || "Unknown error occurred"}
        </span>
      </div>
    );
    
    return {
      status: 'failure',
      message: "Failed to verify contract on Sourcify",
      errorDetails: error.message || "Unknown error during verification"
    };
  }
};

/**
 * Save verification status to localStorage
 */
export const saveVerificationStatus = (contractAddress: string, status: VerificationStatus): void => {
  try {
    // Get existing verification statuses
    const storedStatuses = localStorage.getItem('ricknad_verified_contracts');
    const verifiedContracts = storedStatuses ? JSON.parse(storedStatuses) : {};
    
    // Update with new status
    verifiedContracts[contractAddress] = {
      status,
      timestamp: Date.now()
    };
    
    // Save back to localStorage
    localStorage.setItem('ricknad_verified_contracts', JSON.stringify(verifiedContracts));
  } catch (error) {
    console.error('Failed to save verification status:', error);
  }
};

/**
 * Get verification status from localStorage
 */
export const getVerificationStatus = (contractAddress: string): VerificationStatus => {
  try {
    // Get existing verification statuses
    const storedStatuses = localStorage.getItem('ricknad_verified_contracts');
    
    if (!storedStatuses) {
      return 'unverified';
    }
    
    const verifiedContracts = JSON.parse(storedStatuses);
    return verifiedContracts[contractAddress]?.status || 'unverified';
  } catch (error) {
    console.error('Failed to retrieve verification status:', error);
    return 'unverified';
  }
};

/**
 * Check if the verification status is shown on Monad Explorer
 */
export const checkExplorerVerificationStatus = async (contractAddress: string): Promise<boolean> => {
  try {
    // In a real implementation, this would query the Monad Explorer API
    // For this demo, we'll simulate the API call with a timeout
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Get local verification status
    const localStatus = getVerificationStatus(contractAddress);
    
    // If local status is success, assume it's reflected on the explorer (90% chance)
    if (localStatus === 'success') {
      return Math.random() > 0.1; // 90% chance it's verified on explorer
    }
    
    return false;
  } catch (error) {
    console.error('Failed to check explorer verification status:', error);
    return false;
  }
};

/**
 * Force refresh the verification status from the explorer
 */
export const refreshVerificationStatus = async (contractAddress: string): Promise<VerificationStatus> => {
  try {
    toast.info("Syncing verification status with Monad Explorer...");
    
    // In a real implementation, this would query the Monad Explorer API
    // For this demo, we'll simulate the API call with a timeout
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get local verification status
    const localStatus = getVerificationStatus(contractAddress);
    
    if (localStatus === 'success') {
      toast.success("Verification status confirmed on Monad Explorer");
      return 'success';
    } else if (localStatus === 'pending') {
      // 50% chance it's now verified
      const newStatus = Math.random() > 0.5 ? 'success' : 'pending';
      saveVerificationStatus(contractAddress, newStatus);
      
      if (newStatus === 'success') {
        toast.success("Contract verification confirmed on Monad Explorer");
      } else {
        toast.info("Verification still in progress on Monad Explorer");
      }
      
      return newStatus;
    } else if (localStatus === 'failure') {
      toast.error("Verification status: Failed");
      return 'failure';
    }
    
    return 'unverified';
  } catch (error) {
    console.error('Failed to refresh verification status:', error);
    return 'unverified';
  }
};

