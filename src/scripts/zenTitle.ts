fetch("https://api.github.com/zen")
  .then(res => res.text())
  .then(zen => (document.title = `Casey Webb | ${zen}`))
  .catch(() => {
    // noop
  });
