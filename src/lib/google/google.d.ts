// Minimal ambient types for the Google Identity Services token client.
interface GisTokenResponse {
  access_token: string;
  expires_in: number;
  scope?: string;
  error?: string;
}

interface GisErrorResponse {
  type?: string;
  message?: string;
}

interface GisTokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: GisTokenResponse) => void;
  error_callback?: (error: GisErrorResponse) => void;
}

interface GisTokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}

interface Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient: (config: GisTokenClientConfig) => GisTokenClient;
        revoke: (token: string, done?: () => void) => void;
      };
    };
  };
}
