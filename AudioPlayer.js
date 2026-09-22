/**
 * AudioPlayer.js - Reprodutor de Áudio Ambiente em Loop para o Portfólio
 * Paulo Cid
 */

(function () {
  'use strict';

  // Configuração da música padrão
  const DEFAULT_SOURCES = [
    'assets/audio/background.mp3',
    'assets/audio/background.mp3.mp3',
    'assets/background.mp3'
  ];

  let currentSourceIndex = 0;
  let isMuted = false;
  let previousVolume = 0.6; // Volume inicial padrão (60%)
  let isAutoplayTriggered = false;

  // Carregar volume salvo se existir
  const savedVolume = localStorage.getItem('pc_portfolio_volume');
  let currentVolume = savedVolume !== null ? parseFloat(savedVolume) : 0.6;
  if (isNaN(currentVolume) || currentVolume < 0 || currentVolume > 1) {
    currentVolume = 0.6;
  }

  function initAudioPlayer() {
    const widget = document.getElementById('audio-player-widget');
    const audioElement = document.getElementById('bg-audio');
    const playBtn = document.getElementById('audio-play-btn');
    const playIcon = document.getElementById('audio-play-icon');
    const muteBtn = document.getElementById('audio-mute-btn');
    const muteIcon = document.getElementById('audio-mute-icon');
    const volumeSlider = document.getElementById('audio-volume-slider');
    const volumeVal = document.getElementById('audio-volume-val');
    const statusText = document.getElementById('audio-status-text');
    const trackTitle = document.getElementById('audio-track-title');
    const toggleMinimizeBtn = document.getElementById('audio-minimize-btn');
    const minimizedBubble = document.getElementById('audio-minimized-bubble');

    if (!audioElement || !widget) return;

    // Configurar áudio
    audioElement.loop = true;
    audioElement.volume = currentVolume;

    // Garantir loop contínuo e automático: sempre que acabar, começa de novo sozinha
    audioElement.addEventListener('ended', function () {
      audioElement.currentTime = 0;
      const replayPromise = audioElement.play();
      if (replayPromise !== undefined) {
        replayPromise.catch(function (e) {
          console.warn('Erro ao reiniciar loop:', e);
        });
      }
    });

    // Atualizar visual do slider de volume
    function updateVolumeUI(vol) {
      if (volumeSlider) {
        volumeSlider.value = vol;
        const percent = Math.round(vol * 100);
        volumeSlider.style.setProperty('--vol-percent', `${percent}%`);
        if (volumeVal) {
          volumeVal.textContent = `${percent}%`;
        }
      }

      if (muteIcon && muteBtn) {
        if (vol === 0 || isMuted) {
          muteIcon.textContent = 'volume_off';
          muteBtn.classList.add('is-muted');
        } else if (vol < 0.5) {
          muteIcon.textContent = 'volume_down';
          muteBtn.classList.remove('is-muted');
        } else {
          muteIcon.textContent = 'volume_up';
          muteBtn.classList.remove('is-muted');
        }
      }
    }

    updateVolumeUI(currentVolume);

    // Atualizar UI de Play / Pause
    function updatePlayStateUI(isPlaying) {
      if (isPlaying) {
        widget.classList.add('is-playing');
        if (playIcon) playIcon.textContent = 'pause';
        if (statusText) statusText.textContent = 'Em reprodução';
      } else {
        widget.classList.remove('is-playing');
        if (playIcon) playIcon.textContent = 'play_arrow';
        if (statusText) statusText.textContent = 'Pausado';
      }
    }

    // Play com tratamento de Autoplay
    function playAudio() {
      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(function () {
            updatePlayStateUI(true);
          })
          .catch(function (error) {
            updatePlayStateUI(false);
            if (statusText) statusText.textContent = 'Música Ambiente';
            setupImmediateUnlock();
          });
      }
    }

    function pauseAudio() {
      audioElement.pause();
      updatePlayStateUI(false);
    }

    // Eventos do elemento de áudio
    audioElement.addEventListener('play', function () {
      updatePlayStateUI(true);
    });

    audioElement.addEventListener('pause', function () {
      updatePlayStateUI(false);
    });

    // Tratamento caso a fonte precise de fallback
    audioElement.addEventListener('error', function () {
      if (currentSourceIndex < DEFAULT_SOURCES.length - 1) {
        currentSourceIndex++;
        console.info(`Tentando fonte de áudio alternativa: ${DEFAULT_SOURCES[currentSourceIndex]}`);
        audioElement.src = DEFAULT_SOURCES[currentSourceIndex];
        audioElement.load();
        playAudio();
      } else {
        if (statusText) statusText.textContent = 'Arquivo não encontrado';
        if (trackTitle) trackTitle.textContent = 'background.mp3';
      }
    });

    // Botão Play / Pause
    if (playBtn) {
      playBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (audioElement.paused) {
          playAudio();
        } else {
          pauseAudio();
        }
      });
    }

    // Botão Mute
    if (muteBtn) {
      muteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (audioElement.muted || audioElement.volume === 0) {
          audioElement.muted = false;
          isMuted = false;
          const restoredVol = previousVolume > 0 ? previousVolume : 0.6;
          audioElement.volume = restoredVol;
          currentVolume = restoredVol;
          updateVolumeUI(restoredVol);
        } else {
          previousVolume = audioElement.volume;
          audioElement.muted = true;
          isMuted = true;
          updateVolumeUI(0);
        }
      });
    }

    // Slider de Volume
    if (volumeSlider) {
      const handleVolumeChange = function () {
        const val = parseFloat(volumeSlider.value);
        currentVolume = val;
        audioElement.volume = val;
        if (val > 0) {
          audioElement.muted = false;
          isMuted = false;
          previousVolume = val;
        } else {
          isMuted = true;
        }
        updateVolumeUI(val);
        localStorage.setItem('pc_portfolio_volume', val.toString());
      };

      volumeSlider.addEventListener('input', handleVolumeChange);
      volumeSlider.addEventListener('change', handleVolumeChange);
    }

    // Botão de Minimizar / Expandir
    if (toggleMinimizeBtn) {
      toggleMinimizeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        widget.classList.add('is-minimized');
      });
    }

    if (minimizedBubble) {
      minimizedBubble.addEventListener('click', function (e) {
        e.stopPropagation();
        widget.classList.remove('is-minimized');
      });
    }

    // Iniciar reprodução com garantia de som
    function attemptAutoplay() {
      audioElement.muted = false;
      audioElement.volume = currentVolume;
      updateVolumeUI(currentVolume);

      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(function () {
            isAutoplayTriggered = true;
            updatePlayStateUI(true);
          })
          .catch(function () {
            // O navegador bloqueou áudio não silenciado: inicia de imediato em background
            // e desbloqueia o som ao menor sinal de interação na tela (scroll, toque, clique ou tecla)
            audioElement.muted = true;
            audioElement.play().then(function () {
              updatePlayStateUI(true);
            }).catch(function () {});

            setupImmediateUnlock();
          });
      }
    }

    // Desbloqueia o som na primeiríssima interação (scroll, toque, clique em qualquer lugar da tela)
    function setupImmediateUnlock() {
      const unlockEvents = ['pointerdown', 'mousedown', 'touchstart', 'wheel', 'scroll', 'keydown', 'click'];

      function unlockAudio() {
        if (isAutoplayTriggered) return;
        isAutoplayTriggered = true;

        audioElement.muted = false;
        audioElement.volume = currentVolume;
        updateVolumeUI(currentVolume);

        if (audioElement.paused) {
          audioElement.play().catch(function () {});
        }
        updatePlayStateUI(true);

        unlockEvents.forEach(function (evt) {
          window.removeEventListener(evt, unlockAudio, true);
          document.removeEventListener(evt, unlockAudio, true);
        });
      }

      unlockEvents.forEach(function (evt) {
        window.addEventListener(evt, unlockAudio, { capture: true, passive: true, once: true });
        document.addEventListener(evt, unlockAudio, { capture: true, passive: true, once: true });
      });
    }

    // Executar imediatamente ao abrir a página
    attemptAutoplay();
  }

  // Inicializar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAudioPlayer);
  } else {
    initAudioPlayer();
  }
})();
