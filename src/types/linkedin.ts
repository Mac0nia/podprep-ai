export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  vanityName?: string;
  industry?: string;
  location?: {
    country?: string;
    city?: string;
  };
  positions?: {
    elements: {
      companyName?: string;
      title?: string;
      startDate?: {
        year: number;
        month: number;
      };
      endDate?: {
        year: number;
        month: number;
      };
    }[];
  };
  profilePicture?: {
    displayImage?: string;
  };
}
