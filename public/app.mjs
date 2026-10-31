export async function mountTasteBridge(document, fetchImpl = fetch) {
  const $ = selector => document.querySelector(selector);
  const names = ['Alex', 'Morgan', 'Sam'];
  const compare = $('#compare');
  const retry = $('#retry-options');
  let ready = false;
  let busy = false;
  let revision = 0;

  function clearResults() {
    $('#results').replaceChildren();
    $('#trace').replaceChildren();
  }
  function controls() {
    compare.disabled = busy || !ready;
    retry.disabled = busy;
    $('#failure').disabled = busy || !ready;
    for (const select of $('#people').querySelectorAll('select')) select.disabled = busy;
  }
  function changed() {
    revision++;
    clearResults();
    $('#status').textContent = 'Preferences changed. Compare again.';
  }
  async function loadOptions() {
    if (busy) return;
    ready = false;
    busy = true;
    controls();
    clearResults();
    $('#status').textContent = 'Loading synthetic choices…';
    try {
      const response = await fetchImpl('/api/options', {signal: AbortSignal.timeout(8000)});
      if (!response.ok) throw new Error('Choices could not be loaded. Retry when the local server is available.');
      const options = await response.json();
      if (!Array.isArray(options) || options.length < 3 || options.length > 50 ||
          options.some(x => !x || typeof x.id !== 'string' || !x.id || typeof x.name !== 'string') ||
          new Set(options.map(x => x.id)).size !== options.length) throw new Error('Invalid choices response. Retry loading choices.');
      $('#people').replaceChildren();
      names.forEach((name, i) => {
        const label = document.createElement('label');
        label.textContent = name;
        const select = document.createElement('select');
        select.id = 'person' + i;
        for (const choice of options) {
          const option = document.createElement('option');
          option.value = choice.id;
          option.textContent = choice.name;
          select.append(option);
        }
        select.selectedIndex = i;
        label.append(select);
        $('#people').append(label);
      });
      ready = true;
      retry.hidden = true;
      $('#status').textContent = 'Synthetic choices ready. Compare three preferences.';
    } catch {
      retry.hidden = false;
      $('#status').textContent = 'Choices could not be loaded. Use Retry loading choices.';
    } finally {
      busy = false;
      controls();
    }
  }

  $('#people').addEventListener('change', changed);
  $('#failure').addEventListener('change', changed);
  retry.onclick = loadOptions;
  $('#form').onsubmit = async event => {
    event.preventDefault();
    if (busy || !ready) return;
    const requestRevision = revision;
    const input = {
      people: names.map((name, i) => ({name, seeds: [$('#person' + i).value]})),
      fail: $('#failure').checked
    };
    busy = true;
    controls();
    clearResults();
    $('#status').textContent = 'Comparing separate candidate lists…';
    try {
      const response = await fetchImpl('/api/recommend', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(input), signal: AbortSignal.timeout(8000)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Comparison failed.');
      if (requestRevision !== revision) return;
      if (!Array.isArray(result.candidates) || !Array.isArray(result.trace) || !Array.isArray(result.people)) throw new Error('Invalid comparison response.');
      $('#status').textContent = result.status === 'proposal'
        ? 'Shared candidates found. The final choice stays with the group.'
        : 'No three-way overlap. Discuss the partial options; do not claim consensus.';
      for (const candidate of result.candidates) {
        const card = document.createElement('article');
        const title = document.createElement('h2');
        title.textContent = candidate.name;
        const detail = document.createElement('p');
        detail.textContent = `Coverage ${candidate.coverage}/3 · ${result.people.map((name, i) => name + ': ' + (candidate.ranks[i] ? 'rank ' + candidate.ranks[i] : 'not returned')).join(' · ')}`;
        card.append(title, detail);
        $('#results').append(card);
      }
      for (const step of result.trace) {
        const li = document.createElement('li');
        li.textContent = step.step + ': ' + step.detail;
        $('#trace').append(li);
      }
    } catch (error) {
      if (requestRevision === revision) {
        clearResults();
        $('#status').textContent = error.name === 'TimeoutError' ? 'Comparison timed out. Retry when the server is available.' : error.message;
      }
    } finally {
      busy = false;
      controls();
    }
  };
  await loadOptions();
}

if (typeof document !== 'undefined') await mountTasteBridge(document);
