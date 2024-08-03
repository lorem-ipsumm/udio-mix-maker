import axios from "axios";
import * as fs from "fs";
import * as path from "path";

interface SongResult {
  id: string;
  song_path: string;
  title: string;
  finished: boolean;
}

interface GenerateResponse {
  track_ids: string[];
}

interface StatusResponse {
  all_finished: boolean;
  data: {
    songs: SongResult[];
  };
}

interface SamplerOptions {
  bypass_prompt_optimization: boolean;
  seed: number;
  crop_start_time: number;
  prompt_strength: number;
  clarity_strength: number;
  lyrics_strength: number;
  generation_quality: number;
  audio_conditioning_length_seconds: number;
  use_2min_model: boolean;
}

class Udio {

  private API_BASE_URL = "https://www.udio.com/api";
  private authToken0: string;
  private authToken1: string;

  constructor() {
    this.authToken0 = process.env.UDIO_AUTH_TOKEN_0!;
    this.authToken1 = process.env.UDIO_AUTH_TOKEN_1!;
  }

  private async makeRequest(
    url: string,
    method: "GET" | "POST",
    data?: any,
    headers?: any
  ): Promise<any | null> {
    try {
      const response =
        method === "POST"
          ? await axios.post(url, data, { headers })
          : await axios.get(url, { headers });
      return response;
    } catch (e) {
      console.error(`Error making ${method} request to ${url}: ${e}`);
      return null;
    }
  }

  private getHeaders(getRequest: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: getRequest
        ? "application/json, text/plain, */*"
        : "application/json",
      "Content-Type": "application/json",
      Cookie: `sb-ssr-production-auth-token.0=${this.authToken0}; sb-ssr-production-auth-token.1=${this.authToken1}`,
      Origin: "https://www.udio.com",
      Referer: "https://www.udio.com/create",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Dest": "empty",
    };
    if (!getRequest) {
      headers["sec-ch-ua"] =
        '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"';
      headers["sec-ch-ua-mobile"] = "?0";
      headers["sec-ch-ua-platform"] = '"macOS"';
      headers["sec-fetch-dest"] = "empty";
    }
    return headers;
  }
  
  async generateSong(
    prompt: string, 
    seed: number, 
    use2MinModel?: boolean,
    customLyrics?: string
  ): Promise<GenerateResponse> {
    const body = JSON.stringify({
      lyricInput: customLyrics ? customLyrics : "",
      prompt,
      samplerOptions: {
        bypass_prompt_optimization: true,
        seed,
        crop_start_time: 0.4,
        prompt_strength: 0.5,
        clarity_strength: 0.25,
        lyrics_strength: 0.5,
        generation_quality: 0.75,
        audio_conditioning_length_seconds: 130,
        use_2min_model: use2MinModel ? use2MinModel : false,
      },
    });

    const request = await fetch(`${this.API_BASE_URL}/generate-proxy`, {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        priority: "u=1, i",
        "sec-ch-ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Brave";v="126"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Linux"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-gpc": "1",
        cookie: `sb-ssr-production-auth-token.0=${this.authToken0}; sb-ssr-production-auth-token.1=${this.authToken1}`,
        Referer: "https://www.udio.com/create",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body,
      method: "POST",
    });
    const response = await request.json();
    return response;
  }

  async generateExtension(
    prompt: string,
    seed: number,
    audioConditioningPath?: string,
    audioConditioningSongId?: string,
    customLyrics?: string
  ): Promise<GenerateResponse> {
    const body = JSON.stringify({
      prompt,
      lyricInput: customLyrics ? customLyrics : "",
      samplerOptions: {
        seed,
        audio_conditioning_path: audioConditioningPath,
        audio_conditioning_song_id: audioConditioningSongId,
        audio_conditioning_type: "continuation",
      },
    });

    const request = await fetch(`${this.API_BASE_URL}/generate-proxy`, {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        priority: "u=1, i",
        "sec-ch-ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Brave";v="126"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Linux"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-gpc": "1",
        cookie: `sb-ssr-production-auth-token.0=${this.authToken0}; sb-ssr-production-auth-token.1=${this.authToken1}`,
        Origin: "https://www.udio.com",
        Referer: "https://www.udio.com/create",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body,
      method: "POST",
    });
    const response = await request.json();
    return response;
  }

  async checkSongStatus(songIds: string[]): Promise<StatusResponse | null> {
    const url = `${this.API_BASE_URL}/songs?songIds=${songIds.join(",")}`;
    const headers = this.getHeaders(true);
    const response = await this.makeRequest(url, "GET", null, headers);
    if (response) {
      const data = response.data;
      const allFinished = data.songs.every((song: SongResult) => song.finished);
      return { all_finished: allFinished, data };
    } else {
      return null;
    }
  }

  async processSongs(
    trackIds: string[],
    folder: string
  ): Promise<SongResult[] | null> {
    console.log(`Processing songs in ${folder} with track_ids ${trackIds}...`);
    while (true) {
      const statusResult = await this.checkSongStatus(trackIds);
      if (statusResult === null) {
        console.log(`Error checking song status for ${folder}.`);
        return null;
      } else if (statusResult.all_finished) {
        const songs: SongResult[] = [];
        for (const song of statusResult.data.songs) {
          await this.downloadSong(song.song_path, song.title, folder);
          songs.push(song);
        }
        console.log(`All songs in ${folder} are ready and downloaded.`);
        return songs;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  async downloadSong(
    songUrl: string,
    songTitle: string,
    folder: string = "downloaded_songs"
  ): Promise<void> {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    const filePath = path.join(folder, `${songTitle}.mp3`);
    try {
      const response = await axios.get(songUrl, {
        responseType: "arraybuffer",
      });
      fs.writeFileSync(filePath, response.data);
      console.log(`Downloaded ${songTitle} with url ${songUrl} to ${filePath}`);
    } catch (e) {
      console.error(`Failed to download the song. Error: ${e}`);
    }
  }
}

export default Udio;
