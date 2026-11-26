// Escapes % and _ so a search for "50%" doesn't match everything
const escapeLike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

module.exports = { escapeLike };
