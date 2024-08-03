import Udio from "./udio";

const wrapper = new Udio();

// async sleep method
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const prompts = [
  "outsider house, lofi house, future garage, deep house tech house, atmospheric, lush, jazzy, ethereal, high hats",
  "future garage, deep house tech house, atmospheric, lush, jazzy, ethereal, high hats",
  "Instrumental Hip Hop, Future Garage, Wonky, Glitch Hop, Downtempo, Chillwave, trap, hip hop, dirty, atmospheric, lush, jazzy, ethereal, jazz piano",
  "Neo-Soul, Neo-Psychedelia, Psychedelic Soul, Contemporary R&B, rhythmic, ethereal, lush, jazzy",
  "vaporwave, atmospheric, 90s japanese city pop, nostalgia, ethereal, lush, mysterious, melodic, rhythmic, jazzy chords, jazzy synth, female singer, anri, city pop, japanese lyrics",
];

const getPrompt = () => {
  return prompts[Math.floor(Math.random() * prompts.length)];
};

const generateMix = async (maxLoops: number = 10) => {
  let loopCount = 0;
  let prompt = getPrompt();
  // generate initial song
  let result = await wrapper.generateSong(prompt, -1, true);
  // loop to generate extensions
  while (loopCount++ < maxLoops) {
    try {
      console.log(prompt + "\n");
      const processedSongs = await wrapper.processSongs(
        [result.track_ids[0]],
        "songs"
      ); //
      if (processedSongs === null) {
        console.log("Error processing the songs.");
        return;
      }
      // get a new prompt
      prompt = "remix " + getPrompt();
      // take the first song and generate an extension
      result = await wrapper.generateExtension(
        prompt,
        -1,
        processedSongs[0].song_path,
        processedSongs[0].id,
        "[Instrumental]\n[Remix]"
      );
      await sleep(10000);
    } catch (e) {
      console.log(e);
    }
  }
};

const main = async () => {
  let mixCount = 0;
  let maxMixCount = 3;
  while (mixCount++ < maxMixCount) {
    await generateMix(10);
    await sleep(60000);
  }
};

main();
