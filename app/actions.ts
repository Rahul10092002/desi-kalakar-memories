"use server";

export async function fetchVideoTitles(videoIds: string[]) {
  try {
    const promises = videoIds.map(async (id) => {
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
          { next: { revalidate: 86400 } }
        );
        if (!res.ok) return { id, title: `Track ${id}` };
        const data = await res.json();
        return { id, title: data.title };
      } catch (err) {
        return { id, title: `Track ${id}` };
      }
    });
    
    return await Promise.all(promises);
  } catch (err) {
    return [];
  }
}
