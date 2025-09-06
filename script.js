class MusicPlayer {
    constructor() {
        this.currentPlaylist = [];
        this.currentSongIndex = 0;
        this.isPlaying = false;
        this.isShuffling = false;
        this.isRepeating = false;
        this.shuffledIndices = [];
        this.playlists = {
            all: [],
            vn: [],
            chinese: []
        };
        
        this.initializeElements();
        this.loadPlaylists();
        this.setupEventListeners();
    }

    initializeElements() {
        this.audioPlayer = document.getElementById('audio-player');
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.shuffleBtn = document.getElementById('shuffle-btn');
        this.repeatBtn = document.getElementById('repeat-btn');
        this.progressBar = document.getElementById('progress-bar');
        this.volumeSlider = document.getElementById('volume-slider');
        this.currentTimeEl = document.getElementById('current-time');
        this.durationEl = document.getElementById('duration');
        this.currentTitleEl = document.getElementById('current-title');
        this.currentArtistEl = document.getElementById('current-artist');
        this.songListEl = document.getElementById('song-list');
        this.playlistTitleEl = document.getElementById('playlist-title');
        
        // Set initial volume
        this.audioPlayer.volume = 0.7;
    }

    async loadPlaylists() {
        try {
            // Load all music
            const allMusic = await this.parseM3U8('./All_Music.m3u8');
            this.playlists.all = allMusic;
            
            // Load Vietnamese music
            const vnMusic = await this.parseM3U8('./VN_Music.m3u8');
            this.playlists.vn = vnMusic;
            
            // Load Chinese music
            const chineseMusic = await this.parseM3U8('./Nhac_Hoa.m3u8');
            this.playlists.chinese = chineseMusic;
            
            // Load default playlist
            this.switchPlaylist('all');
        } catch (error) {
            console.error('Error loading playlists:', error);
            this.showError('Failed to load music playlists. Please check your internet connection.');
        }
    }

    async parseM3U8(url) {
        try {
            const response = await fetch(url);
            const text = await response.text();
            const lines = text.split('\n');
            const songs = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('#EXTINF:')) {
                    const titleMatch = line.match(/,(.+)$/);
                    const title = titleMatch ? titleMatch[1] : 'Unknown';
                    const urlLine = lines[i + 1] ? lines[i + 1].trim() : '';
                    
                    if (urlLine && !urlLine.startsWith('#')) {
                        songs.push({
                            title: title,
                            url: urlLine,
                            artist: this.extractArtistFromTitle(title)
                        });
                    }
                }
            }
            
            return songs;
        } catch (error) {
            console.error('Error parsing M3U8:', error);
            return [];
        }
    }

    extractArtistFromTitle(title) {
        // Try to extract artist from title if it contains " - " or other separators
        if (title.includes(' - ')) {
            return title.split(' - ')[0];
        } else if (title.includes('(')) {
            return title.split('(')[0].trim();
        }
        return 'Unknown Artist';
    }

    setupEventListeners() {
        // Playlist buttons
        document.querySelectorAll('.playlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playlist = e.target.getAttribute('data-playlist');
                this.switchPlaylist(playlist);
            });
        });

        // Player controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn.addEventListener('click', () => this.previousSong());
        this.nextBtn.addEventListener('click', () => this.nextSong());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());

        // Progress bar
        this.progressBar.addEventListener('input', () => this.seek());
        
        // Volume control
        this.volumeSlider.addEventListener('input', () => {
            this.audioPlayer.volume = this.volumeSlider.value / 100;
        });

        // Audio events
        this.audioPlayer.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
        this.audioPlayer.addEventListener('ended', () => this.handleSongEnd());
        this.audioPlayer.addEventListener('error', (e) => this.handleAudioError(e));
    }

    switchPlaylist(playlistName) {
        // Update active button
        document.querySelectorAll('.playlist-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-playlist="${playlistName}"]`).classList.add('active');

        // Update current playlist
        this.currentPlaylist = this.playlists[playlistName] || [];
        this.currentSongIndex = 0;
        this.generateShuffledIndices();

        // Update playlist title
        const titles = {
            all: 'All Music',
            vn: 'Vietnamese Music',
            chinese: 'Chinese Music'
        };
        this.playlistTitleEl.textContent = titles[playlistName] || 'Playlist';

        // Render song list
        this.renderSongList();

        // Auto-start playing the first song if playlist has songs
        if (this.currentPlaylist.length > 0) {
            this.playSong(0);
        } else {
            // Stop current playback if no songs
            this.audioPlayer.pause();
            this.isPlaying = false;
            this.updatePlayButton();
        }
    }

    renderSongList() {
        this.songListEl.innerHTML = '';

        if (this.currentPlaylist.length === 0) {
            this.songListEl.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No songs available in this playlist.</p>';
            return;
        }

        this.currentPlaylist.forEach((song, index) => {
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            songItem.innerHTML = `
                <div class="song-number">${index + 1}</div>
                <div class="song-info">
                    <div class="song-title">${song.title}</div>
                    <div class="song-duration">${song.artist}</div>
                </div>
                <i class="fas fa-play play-icon"></i>
            `;

            songItem.addEventListener('click', () => {
                this.playSong(index);
            });

            this.songListEl.appendChild(songItem);
        });
    }

    playSong(index) {
        if (index >= 0 && index < this.currentPlaylist.length) {
            this.currentSongIndex = index;
            const song = this.currentPlaylist[index];

            // Update current track info
            this.currentTitleEl.textContent = song.title;
            this.currentArtistEl.textContent = song.artist;

            // Update active song in list
            document.querySelectorAll('.song-item').forEach((item, i) => {
                item.classList.toggle('active', i === index);
            });

            // Load and play song
            this.audioPlayer.src = song.url;
            this.audioPlayer.load();
            
            // Play the song
            this.audioPlayer.play().then(() => {
                this.isPlaying = true;
                this.updatePlayButton();
            }).catch(error => {
                console.error('Error playing song:', error);
                this.handleAudioError(error);
            });
        }
    }

    togglePlayPause() {
        if (this.currentPlaylist.length === 0) return;

        if (this.isPlaying) {
            this.audioPlayer.pause();
            this.isPlaying = false;
        } else {
            if (!this.audioPlayer.src) {
                this.playSong(0);
                return;
            }
            
            this.audioPlayer.play().then(() => {
                this.isPlaying = true;
            }).catch(error => {
                console.error('Error playing song:', error);
                this.handleAudioError(error);
            });
        }
        
        this.updatePlayButton();
    }

    nextSong() {
        if (this.currentPlaylist.length === 0) return;
        
        let newIndex;
        if (this.isShuffling) {
            const currentShuffledIndex = this.shuffledIndices.indexOf(this.currentSongIndex);
            const nextShuffledIndex = (currentShuffledIndex + 1) % this.shuffledIndices.length;
            newIndex = this.shuffledIndices[nextShuffledIndex];
        } else {
            newIndex = this.currentSongIndex < this.currentPlaylist.length - 1 ? this.currentSongIndex + 1 : 0;
        }
        
        this.playSong(newIndex);
    }

    previousSong() {
        if (this.currentPlaylist.length === 0) return;
        
        let newIndex;
        if (this.isShuffling) {
            const currentShuffledIndex = this.shuffledIndices.indexOf(this.currentSongIndex);
            const prevShuffledIndex = currentShuffledIndex > 0 ? currentShuffledIndex - 1 : this.shuffledIndices.length - 1;
            newIndex = this.shuffledIndices[prevShuffledIndex];
        } else {
            newIndex = this.currentSongIndex > 0 ? this.currentSongIndex - 1 : this.currentPlaylist.length - 1;
        }
        
        this.playSong(newIndex);
    }

    toggleShuffle() {
        this.isShuffling = !this.isShuffling;
        this.shuffleBtn.classList.toggle('active', this.isShuffling);
        
        if (this.isShuffling) {
            this.generateShuffledIndices();
        }
    }

    toggleRepeat() {
        this.isRepeating = !this.isRepeating;
        this.repeatBtn.classList.toggle('active', this.isRepeating);
    }

    generateShuffledIndices() {
        this.shuffledIndices = [...Array(this.currentPlaylist.length).keys()];
        
        // Fisher-Yates shuffle algorithm
        for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.shuffledIndices[i], this.shuffledIndices[j]] = [this.shuffledIndices[j], this.shuffledIndices[i]];
        }
    }

    handleSongEnd() {
        if (this.isRepeating) {
            // Replay the same song
            this.audioPlayer.currentTime = 0;
            this.audioPlayer.play();
        } else {
            // Play next song
            this.nextSong();
        }
    }

    seek() {
        if (!this.audioPlayer.duration) return;
        
        const seekTime = (this.progressBar.value / 100) * this.audioPlayer.duration;
        this.audioPlayer.currentTime = seekTime;
    }

    updateProgress() {
        if (!this.audioPlayer.duration) return;
        
        const progress = (this.audioPlayer.currentTime / this.audioPlayer.duration) * 100;
        this.progressBar.value = progress;
        
        this.currentTimeEl.textContent = this.formatTime(this.audioPlayer.currentTime);
    }

    updateDuration() {
        this.durationEl.textContent = this.formatTime(this.audioPlayer.duration);
    }

    updatePlayButton() {
        const icon = this.playPauseBtn.querySelector('i');
        if (this.isPlaying) {
            icon.className = 'fas fa-pause';
        } else {
            icon.className = 'fas fa-play';
        }
    }

    formatTime(seconds) {
        if (!seconds || !isFinite(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    handleAudioError(error) {
        console.error('Audio error:', error);
        this.showError('Failed to load or play the current song. It may be temporarily unavailable.');
        this.isPlaying = false;
        this.updatePlayButton();
    }

    showError(message) {
        // Create a simple error notification
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 1000;
            max-width: 300px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 5000);
    }
}

// Initialize the music player when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MusicPlayer();
});

// Service Worker registration for better caching (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {
            // Service worker registration failed, but that's okay
        });
    });
}
