export async function fetchGuestSuggestions(formData: any) {
  try {
    const response = await fetch('/api/guests/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch guest suggestions');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching guest suggestions:', error);
    throw error;
  }
}
