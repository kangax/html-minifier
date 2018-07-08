'use strict';

class Sorter {
  sort(tokens, fromIndex = 0) {
    for (let i = 0, len = this.keys.length; i < len; i++) {
      const key = this.keys[i];
      const token = key.slice(1);
      let index = tokens.indexOf(token, fromIndex);
      if (index !== -1) {
        do {
          if (index !== fromIndex) {
            tokens.splice(index, 1);
            tokens.splice(fromIndex, 0, token);
          }
          fromIndex++;
        } while ((index = tokens.indexOf(token, fromIndex)) !== -1);
        return this[key].sort(tokens, fromIndex);
      }
    }
    return tokens;
  }
}

class TokenChain {
  add(tokens) {
    const self = this;
    tokens.forEach(token => {
      const key = `$${token}`;
      if (!self[key]) {
        self[key] = [];
        self[key].processed = 0;
      }
      self[key].push(tokens);
    });
  }

  createSorter() {
    const self = this;
    const sorter = new Sorter();
    sorter.keys = Object.keys(self).sort((j, k) => {
      const m = self[j].length;
      const n = self[k].length;
      return m < n ? 1 : m > n ? -1 : j < k ? -1 : j > k ? 1 : 0;
    }).filter(key => {
      if (self[key].processed < self[key].length) {
        const token = key.slice(1);
        const chain = new TokenChain();
        self[key].forEach(tokens => {
          let index;
          while ((index = tokens.indexOf(token)) !== -1) {
            tokens.splice(index, 1);
          }
          tokens.forEach(tok => {
            self[`$${tok}`].processed++;
          });
          chain.add(tokens.slice(0));
        });
        sorter[key] = chain.createSorter();
        return true;
      }
      return false;
    });
    return sorter;
  }
}

module.exports = TokenChain;
