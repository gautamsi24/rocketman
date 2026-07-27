export async function fetchPodcastAudioUrl(conceptId: string): Promise<string> {
  const res = await fetch(`/api/concepts/${conceptId}/podcast`);
  if (!res.ok) throw new Error("Podcast request failed");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
