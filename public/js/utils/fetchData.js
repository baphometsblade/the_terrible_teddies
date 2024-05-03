export async function fetchTeddyData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch data: ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.json();
    console.log('Successfully fetched teddy data:', data);
    return data;
  } catch (error) {
    console.error('Fetch error:', error.message, error.stack);
    throw error;
  }
}
