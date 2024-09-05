$(document).ready(() => {
  const fetchButton = $('#fetch-btn');
  const recipeUrlInput = $('#recipe-url');
  const message$ = $('#message');

  const recipeDetails = $('#recipe-details');
  const recipeIngredients = $('#recipe-ingredients');
  const recipeSteps = $('#recipe-steps');

  const actionButtons = $('#action-buttons');

  let recipe = null;
  let voiceSections = [];
  let voiceSectionIdx = -1;
  let voiceSet = false;
  let speakingIntervalId = null

  fetchButton.on('click', fetchRecipe);
  recipeUrlInput.on('keypress', function(event) {
    if (event.key === 'Enter') {
      fetchRecipe();
    }
  });

  $('#go-previous').on('click', speakPrevious);
  $('#go-next').on('click', speakNext);
  $('#repeat').on('click', speakCurrent);

  async function fetchRecipe() {
    const url = recipeUrlInput.val().trim();
    if (!url) {
      return;
    }

    try {
      fetchButton.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>');
      const resp = await $.ajax({
        url: `/fetch-recipe?url=${encodeURIComponent(url)}`,
        method: 'GET',
        dataType: 'json',
        complete: function() {
          fetchButton.html('<i class="bi bi-arrow-right"></i>');
        }
      });

      if (resp.message) {
        renderChatResponse(resp.message);
      }
      recipe = resp.recipe;

      renderRecipe();
    } catch (error) {
      console.error(error);
      message$.html(`<div class="alert alert-danger">${'Failed to fetch and process recipe'}</div>`);
    }
  }

  function renderChatResponse(message) {
    message$.text(message);
  }

  function renderRecipe() {
    const { title, summary, ingredients, steps } = recipe;

    voiceSections = [];

    // Render title and summary
    let idx = 0;
    recipeDetails.append(
      $(`<div class="voice-section" data-idx="${idx++}" />`).html(`<h2>${title}</h2><p>${summary}</p>`)
    );
    voiceSections.push({
      message: `${title}: ${summary}`
    });

    // Render ingredients
    for (let ingredientSublist of ingredients) {
      const { location, items } = ingredientSublist;
      const list = $('<ul />');
      items.forEach(function(item) {
        list.append($(`<li>${item}</li>`));
      });

      recipeDetails.append(
        $(`<div class="voice-section" data-idx="${idx++}" />`)
          .append($(`<h4>Ingredients, ${location}</h4>`))
          .append(list)
      );

      voiceSections.push({
        message: `Ingredients from the ${location}: ${items.join(', ')}`
      });
    }

    // Add each recipe step
    recipeDetails.append($('<h4>Steps</h4>'));
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      recipeDetails.append(
        $(`<p class="voice-section" data-idx="${idx++}" />`).html(`${i+1}. ${step}`)
      );

      voiceSections.push({
        message: `Step ${i+1}: ${step}`
      });
    }

    // Reset button to arrow icon after rendering completes
    fetchButton.html('<i class="bi bi-arrow-right"></i>');
    actionButtons.show();

    voiceSectionIdx = 0;
    speakCurrent();
  }

  function speakPrevious() {
    if (voiceSectionIdx > 0) {
      voiceSectionIdx--;
    }
    speakCurrent();
  }

  function speakNext() {
    if (voiceSectionIdx < voiceSections.length - 1) {
      voiceSectionIdx++;
    }
    speakCurrent();
  }

  function speakCurrent() {
    speak(voiceSections[voiceSectionIdx].message);

    const currentSection = $('[data-idx="' + voiceSectionIdx + '"]');
    $('.voice-section').removeClass('speaking');
    currentSection.addClass('speaking');

    var containerHeight = $(window).height();
    var elementHeight = currentSection.outerHeight();
    var scrollTop = currentSection.offset().top - (containerHeight / 2 - elementHeight / 2);

    window.scrollTo({
      top: scrollTop,
      behavior: 'smooth',
    });
  }

  function speak(text) {
    if (!voiceSet && !window.speechSynthesis.getVoices().length) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        voiceSet = true;
        speak(text);
      };
      return;
    }

    clearInterval(speakingIntervalId);
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const newVoice = window.speechSynthesis.getVoices().find(voice => voice.voiceURI === 'Google UK English Female'); // Google US English
    if (newVoice) {
      utterance.voice = newVoice;
    }
    window.speechSynthesis.speak(utterance);
    speakingIntervalId = setInterval(function () {
      if (!window.speechSynthesis.speaking) {
        clearInterval(speakingIntervalId);
      }
      else {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
  }, 14000);
  }

});
