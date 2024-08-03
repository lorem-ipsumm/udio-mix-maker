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
      // set up the request options
      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      };
      // add data to the request body if it's a POST request
      if (method === "POST" && data) {
        options.body = JSON.stringify(data);
      }
      // make the request
      const response = await fetch(url, options);
      // check if the response is ok
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // parse the response as json
      const result = await response.json();
      return result;
    } catch (e) {
      console.error(`Error making ${method} request to ${url}: ${e}`);
      return null;
    }
  }

  private getHeaders(getRequest: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {
      accept: getRequest
        ? "application/json, text/plain, */*"
        : "application/json",
      "accept-language": "en-US,en;q=0.9",
      "content-type": "application/json",
      priority: "u=1, i",
      cookie: `sb-ssr-production-auth-token.0=${this.authToken0}; sb-ssr-production-auth-token.1=${this.authToken1}`,
      Referer: "https://www.udio.com/create",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    };
    if (!getRequest) {
      headers["sec-ch-ua"] =
        '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"';
      headers["sec-ch-ua-mobile"] = "?0";
      headers["sec-ch-ua-platform"] = '"macOS"';
      headers["sec-fetch-dest"] = "empty";
      headers["sec-fetch-mode"] = "cors";
      headers["sec-fetch-site"] = "same-origin";
      headers["sec-gpc"] = "1";
    }
    return headers;
  }

  // generate a new song
  async generateSong(
    prompt: string,
    seed: number,
    use2MinModel?: boolean,
    customLyrics?: string
  ): Promise<GenerateResponse> {
    const body = {
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
    };
    const headers = this.getHeaders();
    const response = await this.makeRequest(
      `${this.API_BASE_URL}/generate-proxy`,
      "POST",
      body,
      headers
    );
    return response;
  }

  // generate an extension of a given song
  async generateExtension(
    prompt: string,
    seed: number,
    audioConditioningPath?: string,
    audioConditioningSongId?: string,
    customLyrics?: string
  ): Promise<GenerateResponse> {
    const body = {
      prompt,
      lyricInput: customLyrics ? customLyrics : "",
      samplerOptions: {
        seed,
        bypass_prompt_optimization: true,
        audio_conditioning_path: audioConditioningPath,
        audio_conditioning_song_id: audioConditioningSongId,
        audio_conditioning_type: "continuation",
      },
    };
    const headers = this.getHeaders();
    const response = await this.makeRequest(
      `${this.API_BASE_URL}/generate-proxy`,
      "POST",
      body,
      headers
    );
    return response;
  }

  // check the status of the song to see if it's done
  async checkSongStatus(songIds: string[]): Promise<StatusResponse | null> {
    const url = `${this.API_BASE_URL}/songs?songIds=${songIds.join(",")}`;
    const headers = this.getHeaders(true);
    const response = await this.makeRequest(url, "GET", null, headers);
    if (response) {
      const songs = response.songs;
      const allFinished = songs.every((song: SongResult) => song.finished);
      return { all_finished: allFinished, data: { songs } };
    } else {
      return null;
    }
  }

  // repeatedly check the status of the song until it's done
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
      const response = await fetch(songUrl);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(buffer));
      console.log(`Downloaded ${songTitle} with url ${songUrl} to ${filePath}`);
    } catch (e) {
      console.error(`Failed to download the song. Error: ${e}`);
    }
  }
}

export default Udio;
