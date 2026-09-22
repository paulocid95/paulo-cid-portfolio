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
  let previousVolume = 0.6; // Volume padrão inicial (60%)
  let firstInteractionTriggered = false;

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

    // Configurações iniciais do áudio
    audioElement.loop = true;
    audioElement.volume = currentVolume;
    audioElement.muted = false;

    // Sincronização estrita da interface com o estado real do elemento de áudio
    function syncPlaybackUI() {
      const isPaused = audioElement.paused;

      if (!isPaused) {
        // Está tocando: exibe ícone de Pause e ativa animações
        widget.classList.add('is-playing');
        if (playIcon) playIcon.textContent = 'pause';
        if (playBtn) playBtn.title = 'Pausar música';
        if (statusText) statusText.textContent = 'Em reprodução';
      } else {
        // Está pausado: exibe ícone de Play e desativa animações
        widget.classList.remove('is-playing');
        if (playIcon) playIcon.textContent = 'play_arrow';
        if (playBtn) playBtn.title = 'Tocar música';
        if (statusText) statusText.textContent = 'Pausado';
      }
    }

    // Atualização visual do controle de volume e do botão de mute
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
        if (vol === 0 || audioElement.muted) {
          muteIcon.textContent = 'volume_off';
          muteBtn.classList.add('is-muted');
          muteBtn.title = 'Ativar som';
        } else if (vol < 0.5) {
          muteIcon.textContent = 'volume_down';
          muteBtn.classList.remove('is-muted');
          muteBtn.title = 'Mutar som';
        } else {
          muteIcon.textContent = 'volume_up';
          muteBtn.classList.remove('is-muted');
          muteBtn.title = 'Mutar som';
        }
      }
    }

    // Inicializa a UI com os valores reais
    updateVolumeUI(currentVolume);
    syncPlaybackUI();

    // Eventos nativos do elemento de áudio como fonte da verdade
    audioElement.addEventListener('play', syncPlaybackUI);
    audioElement.addEventListener('playing', syncPlaybackUI);
    audioElement.addEventListener('pause', syncPlaybackUI);

    // Loop contínuo: sempre que acabar começa de novo sozinha
    audioElement.addEventListener('ended', function () {
      audioElement.currentTime = 0;
      const replayPromise = audioElement.play();
      if (replayPromise !== undefined) {
        replayPromise.catch(function () {
          // Ignora rejeição silenciosamente
        });
      }
    });

    // Fallback de fontes caso necessário
    audioElement.addEventListener('error', function () {
      if (currentSourceIndex < DEFAULT_SOURCES.length - 1) {
        currentSourceIndex++;
        audioElement.src = DEFAULT_SOURCES[currentSourceIndex];
        audioElement.load();
        audioElement.play().catch(function () {});
      } else {
        if (statusText) statusText.textContent = 'Arquivo não encontrado';
        if (trackTitle) trackTitle.textContent = 'background.mp3';
      }
    });

    // Botão de Play / Pause
    if (playBtn) {
      playBtn.addEventListener('click', function (e) {
        e.stopPropagation();

        if (audioElement.paused) {
          // Se estava pausado, inicia a reprodução
          const playPromise = audioElement.play();
          if (playPromise !== undefined) {
            playPromise.catch(function () {
              // Silencia erros no console caso o navegador bloqueie
              syncPlaybackUI();
            });
          }
        } else {
          // Se estava tocando, pausa
          audioElement.pause();
        }
      });
    }

    // Botão de Mute / Unmute
    if (muteBtn) {
      muteBtn.addEventListener('click', function (e) {
        e.stopPropagation();

        if (audioElement.muted || audioElement.volume === 0) {
          audioElement.muted = false;
          const restoredVol = previousVolume > 0 ? previousVolume : 0.6;
          audioElement.volume = restoredVol;
          currentVolume = restoredVol;
          updateVolumeUI(restoredVol);
        } else {
          previousVolume = audioElement.volume;
          audioElement.muted = true;
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
          previousVolume = val;
        } else {
          audioElement.muted = true;
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

    // Integração com a Splash Screen
    const splashScreen = document.getElementById('splash-screen');
    const splashEnterBtn = document.getElementById('splash-enter-btn');

    if (splashEnterBtn && splashScreen) {
      splashEnterBtn.addEventListener('click', function (e) {
        e.stopPropagation();

        // 1. Iniciar áudio com volume suave e fade-in progressivo
        audioElement.muted = false;
        const targetVol = currentVolume;
        const initialFadeVol = Math.min(0.05, targetVol);
        audioElement.volume = initialFadeVol;
        updateVolumeUI(initialFadeVol);

        const playPromise = audioElement.play();
        if (playPromise !== undefined) {
          playPromise
            .then(function () {
              // Fade-in suave de volume até o volume configurado
              const steps = 12;
              const stepDuration = 60; // 60ms * 12 = 720ms
              const volIncrement = (targetVol - initialFadeVol) / steps;
              let currentStep = 0;

              const fadeInterval = setInterval(function () {
                currentStep++;
                const nextVol = Math.min(targetVol, initialFadeVol + volIncrement * currentStep);
                audioElement.volume = nextVol;
                updateVolumeUI(nextVol);

                if (currentStep >= steps) {
                  clearInterval(fadeInterval);
                  audioElement.volume = targetVol;
                  updateVolumeUI(targetVol);
                }
              }, stepDuration);

              syncPlaybackUI();
            })
            .catch(function (error) {
              console.warn('Erro ao reproduzir áudio:', error);
              syncPlaybackUI();
            });
        }

        // 2. Transição suave de fade-out da Splash Screen
        splashScreen.classList.add('splash-screen--fade-out');

        // 3. Remover/Ocultar do DOM e liberar recursos do WebGL WarpText
        setTimeout(function () {
          splashScreen.style.display = 'none';
          if (window.splashWarpInstance && typeof window.splashWarpInstance.destroy === 'function') {
            window.splashWarpInstance.destroy();
          }
        }, 800);
      });
    }

    // Fallback: Autoplay na primeira interação caso a splash não esteja presente
    const interactionEvents = ['click', 'keydown', 'touchstart', 'pointerdown'];

    function removeInteractionListeners() {
      interactionEvents.forEach(function (evt) {
        document.removeEventListener(evt, handleFirstInteraction, true);
      });
    }

    function handleFirstInteraction() {
      if (firstInteractionTriggered) return;
      firstInteractionTriggered = true;
      removeInteractionListeners();

      if (audioElement.paused && (!splashScreen || splashScreen.style.display === 'none')) {
        audioElement.muted = false;
        audioElement.volume = currentVolume;
        const playPromise = audioElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(function () {
            syncPlaybackUI();
          });
        }
      }
    }

    interactionEvents.forEach(function (evt) {
      document.addEventListener(evt, handleFirstInteraction, { capture: true, once: true });
    });
  }

  // Inicializar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAudioPlayer);
  } else {
    initAudioPlayer();
  }
})();
