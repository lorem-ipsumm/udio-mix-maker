import Udio from "./udio";

const wrapper = new Udio();

// async sleep method
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const genres = [
  "hip hop, high hats, future bass, glitch hop, alternative r&b, UK Bass, trap, future garage",
  "Synth funk, psychedelic soul, instrumental hip hop",
  "Sigilkore, HexD, trap, glitch hop, trap, UK Bass",
  "outsider house, lofi house, future garage, deep house tech house",
  "Vaporwave, 80s japanese city pop, anri, city pop",
  "jungle, drum and bass, dynamic and lush chords, breakbeat, UK Bass",
  "Neo-Soul, Neo-Psychedelia, Psychedelic Soul, Contemporary R&B",
  "Instrumental Hip Hop, Future Garage, Wonky, Glitch Hop, Chillwave, trap, hip hop",
  "future garage, deep house tech house",
]

const modifiers = [
  "dirty",
  "offbeat",
  "ethereal",
  "melodic",
  "atmospheric",
  "lush",
  "jazzy",
  "ethereal",
  "nostalgic",
  "mysterious",
  "rhythmic",
  "downtempo",
  "wonky",
  "urban",
  "vulgar",
  "upbeat",
  "melancholic",
  "mellow",
  "fast",
  "synth"
]

const getModifiers = (numModifiers: number): string[] => {
  const shuffled = [...modifiers].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numModifiers);
};

const getPrompt = (genre: string, numModifiers: number) => {
  let prompt = genre;
  const modifiers = getModifiers(numModifiers);
  for (const modifier of modifiers) {
    prompt = prompt + ", " + modifier;
  }
  return prompt;
};

const shouldTransition = (timestamp: number, lastTimestamp: number) => {
  // if the last remix was more than x minute ago, remix
  return timestamp - lastTimestamp > (60000 * 1);
}

const generateMix = async (maxLoops: number = 10) => {
  let loopCount = 0;
  const numModifiers = 5;
  const genre = genres[0];
  let prompt = getPrompt(genre, numModifiers);
  let promptList = [prompt];
  let lastTimestamp = Date.now();
  let isTransition = false;
  // generate initial song
  let result = await wrapper.generateSong({
    prompt: "mix " + prompt
  });
  // loop to generate extensions
  while (loopCount++ < maxLoops) {
    try {
      console.log(promptList.join("\n") + "\n");
      if (!result) {
        console.log("Error generating the song.");
        break;
      }
      console.log(prompt + "\n");
      const processedSongs = await wrapper.processSongs(
        [result.track_ids[0]],
        "songs"
      );
      if (processedSongs === null) {
        console.log("Error processing the songs.");
        break;
      }
      // generate new prompt with new modifiers
      prompt = getPrompt(genre, numModifiers);
      // should the song transition? (was the previous generation an outro?)
      if (isTransition) {
        prompt = "transition, beat switch, remix, " + prompt;
        lastTimestamp = Date.now();
        isTransition = false;
      }
      promptList.push(prompt);
      console.log(loopCount);
      // transition to a new song every x loops
      isTransition = loopCount % 2 === 0;
      if (isTransition) {
        console.log("generating outro");
      }
      // take the previous song and generate an extension
      result = await wrapper.generateExtension({
        prompt,
        extensionSourceId: processedSongs[0].id,
        seed: -1,
        isOutro: isTransition
      });
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
