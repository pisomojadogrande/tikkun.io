/* global gtag */

import parshiyot from '../build/parshiyot.json'
import readingSchedule from '../build/schedule.json'
import holydays from '../build/holydays.json'
import fuzzy from '../src/fuzzy'
import utils from './utils'
import ParshaResult, { NoResults } from './ParshaResult'

const { htmlToElement } = utils

const holydaysLayout = [
  ['rosh-1', 'rosh-2', 'yom-kippur', 'taanit-tzibur', 'tisha-bav', 'shavuot-1', 'shavuot-2'],
  ['sukkot-1', 'sukkot-2', 'sukkot-3', 'sukkot-4', 'sukkot-5', 'sukkot-6', 'sukkot-7', 'sukkot-shabbat-chol-hamoed', 'shmini-atzeret', 'simchat-torah'],
  ['pesach-1', 'pesach-2', 'pesach-3', 'pesach-4', 'pesach-5', 'pesach-6', 'pesach-shabbat-chol-hamoed', 'pesach-7', 'pesach-8'],
  ['purim', 'chanukah-1', 'chanukah-2', 'chanukah-3', 'chanukah-4', 'chanukah-5', 'chanukah-7', 'chanukah-8']
]

const Parsha = ({ ref, he, scroll }) => `
  <li
    class="parsha"
    data-target-id="parsha"
    data-jump-to-book="${ref.b}"
    data-jump-to-chapter="${ref.c}"
    data-jump-to-verse="${ref.v}"
    data-scroll="${scroll}"
  >
    ${he}
  </li>
  `

const Book = (book) => `
  <li class="parsha-book">
    <ol class="parsha-list">
      ${book.map(b => Parsha({ ...b, scroll: 'torah' })).join('')}
    </ol>
  </li>
`

const refFromLabel = ({ label }) => parshiyot
  .find(({ he }) => label.startsWith(he))
  .ref

const ComingUpReading = ({ label, date, datetime }) => {
  const { b: book, c: chapter, v: verse } = refFromLabel({ label })
  return `
  <li style="display: table-cell; width: calc(100% / 3); padding: 0 0.5em;">
    <div class="stack small" style="display: flex; flex-direction: column; align-items: center;">
      <button
        data-target-class="coming-up-reading"
        data-jump-to-book="${book}"
        data-jump-to-chapter="${chapter}"
        data-jump-to-verse="${verse}"
        data-scroll="torah"
        class="coming-up-button"
      >${label}</button>
      <time class="coming-up-date" datetime="${datetime}">${date}</time>
    </div>
  </li>
  `
}

const comingUpReadings = readingSchedule
  .filter(reading => new Date(reading.datetime) > new Date())
  .slice(0, 3)

const ComingUp = () => `
  <section dir="ltr" id="coming-up" class="section mod-alternate mod-padding">
    <div class="stack medium">
      <label class="section-label">Coming up</label>
      <div style="overflow-x: auto;">
        <ol class="cluster" style="list-style: none; display: table; margin-left: auto; margin-right: auto; white-space: nowrap;">
          ${comingUpReadings
            .map(ComingUpReading)
            .join('')
          }
        </ol>
      </div>
    </div>
  </section>
`

const Browse = () => `
  <div class="browse">
    <h2 class="section-heading">פרשת השבוע</h2>
    <ol class="parsha-books mod-emphasize-first-in-group">
      ${parshiyot
        .reduce((books, parsha) => {
          const book = parsha.ref.b
          books[book] = books[book] || []
          books[book].push(parsha)
          return books
        }, [])
        .map(Book)
        .join('')
      }
    </ol>

    <h2 class="section-heading">חגים</h2>
    <ol class="parsha-books">
      ${holydaysLayout.map(col => `
        <li class="parsha-book">
          <ol class="parsha-list">
            ${col.map(holydayKey => {
              const holyday = holydays[holydayKey]

              const { ref, he } = holyday

              const { b, c, v } = ref

              return Parsha({ ref: { b, c, v }, he, scroll: holydayKey })
            }).join('\n')}
          </ol>
        </li>
      `).join('\n')}
    </ol>

    <h2 class="section-heading">מגילות</h2>
    <ol class="parsha-books">
      <li class="parsha-book">
        <ol class="parsha-list">
          ${Parsha({ ref: { b: 1, c: 1, v: 1 }, he: 'אסתר', scroll: 'esther' })}
        </ol>
      </li>
    </ol>
  </div>
`

const ParshaPicker = (search, searchEmitter, jumpToRef) => {
  const self = htmlToElement(`
    <div class="parsha-picker">
      <div class="stack xlarge">
        <div class="centerize">
          <div id="search" style="display: inline-block;"></div>
        </div>
        ${ComingUp()}
        ${Browse()}
      </div>
    </div>
  `)

  searchEmitter.on('selection', (selected) => {
    gtag('event', 'search_selection', {
      event_category: 'navigation',
      event_label: selected.querySelector('[data-target-class="result-hebrew"]').textContent.trim()
    })

    const result = selected.querySelector('[data-target-class="parsha-result"]')

    jumpToRef({ ref: result, scroll: result.getAttribute('data-scroll') })
  })

  searchEmitter.on('search', query => {
    self.querySelector('.browse').classList.add('u-hidden')
    self.querySelector('#coming-up').classList.add('u-hidden')
    gtag('event', 'search', {
      event_category: 'navigation',
      event_label: query
    })
  })

  searchEmitter.on('clear', () => {
    self.querySelector('.browse').classList.remove('u-hidden')
    self.querySelector('#coming-up').classList.remove('u-hidden')
  })

  self.querySelector('#search').parentNode.replaceChild(search, self.querySelector('#search'))

  ;[...self.querySelectorAll('[data-target-id="parsha"]')]
    .forEach((parsha) => {
      parsha.addEventListener('click', (e) => {
        gtag('event', 'browse_selection', {
          event_category: 'navigation',
          event_label: e.target.textContent.trim()
        })
        jumpToRef({ ref: e.target, scroll: e.target.getAttribute('data-scroll') })
      })
    })

  ;[...self.querySelectorAll('[data-target-class="coming-up-reading"]')]
    .forEach(comingUpReading => {
      comingUpReading.addEventListener('click', e => {
        gtag('event', 'coming_up_selection', {
          event_category: 'navigation',
          event_label: e.target.textContent.trim()
        })

        jumpToRef({ ref: e.target, scroll: e.target.getAttribute('data-scroll') })
      })
    })

  return self
}

const searchables = [
  ...parshiyot.map(p => ({ ...p, scroll: 'torah' })),
  {
    he: 'אסתר',
    en: 'Esther',
    ref: { b: 1, c: 1, v: 1 },
    scroll: 'esther'
  },
  ...Object.keys(holydays).map(holydayKey => {
    const holyday = holydays[holydayKey]

    const { he, en, ref } = holyday

    const { b, c, v } = ref

    return {
      scroll: holydayKey,
      en,
      he,
      ref: { b, c, v }
    }
  })
]

const searchResults = (query) => {
  const results = fuzzy(searchables, query, parsha => [parsha.he, parsha.en])

  return results.length ? results : [{
    item: 'No results',
    match: { index: 0, indexes: [] }
  }]
}

const top = (n) => (_, i) => i < n

const search = query => searchResults(query)
  .filter(top(5))
  .map(result => result.item === 'No results'
    ? NoResults()
    : ParshaResult(result)
  )

export { search }

export default ParshaPicker
