const $player = document.querySelector("audio") as HTMLAudioElement;
const $playerSrc = document.querySelector(
  "audio > source"
) as HTMLSourceElement;
const $songs = document.querySelectorAll("li");

$songs[0].className = "now-playing";

$songs.forEach(($li, i) => {
  $li.addEventListener("click", () => {
    const songTitle = $li.textContent as string;
    const $currentlyPlaying = document.querySelector(
      ".now-playing"
    ) as HTMLLIElement;
    $playerSrc.setAttribute(
      "src",
      `./assets/0${i + 1}. ${songTitle.replace(/[?.]$/, "")}.mp3`
    );
    $currentlyPlaying.className = "";
    document.title = `Sugar Daddy | ${$li.textContent}`;
    $li.className = "now-playing";
    $player.load();
    $player.play();
  });
});

$player.addEventListener("ended", () => {
  const $nextSong: null | HTMLLIElement = document.querySelector(
    "li.now-playing + li"
  );
  if ($nextSong) {
    $nextSong.click();
  }
});
