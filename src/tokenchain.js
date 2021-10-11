'use strict';

function Sorter() {}

Sorter.prototype.sort = function(tokens, fromIndex) {
  fromIndex = fromIndex || 0;

  for (const key of this.keys) {
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
};

function TokenChain() {}

TokenChain.prototype = {
  add(tokens) {
    for (const token of tokens) {
      const key = '$' + token;
      if (!this[key]) {
        this[key] = [];
        this[key].processed = 0;
      }

      this[key].push(tokens);
    }
  },
  createSorter() {
    const sorter = new Sorter();
    sorter.keys = Object.keys(this)
      .sort((j, k) => {
        const m = this[j].length;
        const n = this[k].length;
        return m < n ? 1 : (m > n ? -1 : j < k ? -1 : j > k ? 1 : 0);
      })
      .filter(key => {
        if (this[key].processed < this[key].length) {
          const token = key.slice(1);
          const chain = new TokenChain();
          for (const tokens of this[key]) {
            let index;
            while ((index = tokens.indexOf(token)) !== -1) {
              tokens.splice(index, 1);
            }

            for (const token of tokens) {
              this['$' + token].processed++;
            }

            chain.add([...tokens]);
          }

          sorter[key] = chain.createSorter();
          return true;
        }

        return false;
      });
    return sorter;
  }
};

module.exports = TokenChain;
