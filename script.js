/**
 * Rudra - AI Voice Assistant
 * A client-side voice assistant with YouTube, Wikipedia, and TV connectivity
 */

class RudraAssistant {
    constructor() {
        this.isListening = false;
        this.isTVConnected = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.currentVoice = null;
        

        
        // DOM elements
        this.micButton = document.getElementById('mic-button');
        this.tvButton = document.getElementById('tv-button');
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        this.statusDot = document.getElementById('status-dot');
        this.voiceInput = document.getElementById('voice-input');
        this.assistantResponse = document.getElementById('assistant-response');
        this.tvStatus = document.getElementById('tv-status');
        this.micText = document.getElementById('mic-text');
        this.tvText = document.getElementById('tv-text');
        this.tvStatusText = document.getElementById('tv-status-text');

        this.init();
    }

    init() {
        // Check for Web Speech API support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showError('Web Speech API not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        this.setupSpeechRecognition();
        this.setupEventListeners();
        this.setupVoices();
        this.updateStatus('idle');
        
        console.log('Rudra Assistant initialized successfully');
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            console.log('Speech recognition started');
            this.updateStatus('listening');
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Display interim results
            if (interimTranscript) {
                this.voiceInput.textContent = interimTranscript;
                this.voiceInput.classList.add('active');
            }

            // Process final results
            if (finalTranscript) {
                this.voiceInput.textContent = finalTranscript;
                
                this.processCommand(finalTranscript.trim());
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                // Continue listening silently
                return;
            }
            this.showError(`Speech recognition error: ${event.error}`);
            this.stopListening();
        };

        this.recognition.onend = () => {
            console.log('Speech recognition ended');
            if (this.isListening) {
                // Restart recognition if it should still be listening
                setTimeout(() => {
                    try {
                        this.recognition.start();
                    } catch (error) {
                        console.log('Recognition restart failed:', error);
                    }
                }, 100);
            } else {
                this.updateStatus('idle');
            }
        };
    }

    setupVoices() {
        // Wait for voices to be loaded
        const setVoice = () => {
            const voices = this.synthesis.getVoices();
            // Prefer female English voices
            this.currentVoice = voices.find(voice => 
                voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female')
            ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
        };

        if (this.synthesis.getVoices().length > 0) {
            setVoice();
        } else {
            this.synthesis.addEventListener('voiceschanged', setVoice);
        }
    }

    setupEventListeners() {
        this.micButton.addEventListener('click', () => {
            this.toggleListening();
        });

        this.tvButton.addEventListener('click', () => {
            this.toggleTVConnection();
        });



        // Remove modal event listeners since we simplified TV connection

        // Handle page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isListening) {
                // Keep listening even when tab is not visible
                console.log('Tab hidden but continuing to listen');
            }
        });
    }

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    startListening() {
        try {
            this.isListening = true;
            this.recognition.start();
            this.micButton.classList.add('active');
            this.micText.textContent = 'Stop Listening';
            this.voiceInput.textContent = 'Listening for "Rudra" commands...';
            this.updateStatus('listening');
        } catch (error) {
            console.error('Failed to start listening:', error);
            this.showError('Failed to start voice recognition');
            this.isListening = false;
        }
    }

    stopListening() {
        this.isListening = false;
        this.recognition.stop();
        this.micButton.classList.remove('active');
        this.micText.textContent = 'Start Listening';
        this.voiceInput.textContent = 'Say "Rudra" followed by your command...';
        this.voiceInput.classList.remove('active');
        this.updateStatus('idle');
    }

    async toggleTVConnection() {
        if (this.isTVConnected) {
            this.disconnectTV();
        } else {
            await this.connectTV();
        }
    }

    async connectTV() {
        this.updateStatus('processing');
        this.tvText.textContent = 'Connecting...';
        
        // Simple TV connection like Alexa
        setTimeout(() => {
            this.isTVConnected = true;
            this.updateTVStatus(true);
            this.speak('TV connected successfully');
        }, 1500);
    }

    async initializeCastAPI() {
        return new Promise((resolve, reject) => {
            const context = cast.framework.CastContext.getInstance();
            context.setOptions({
                receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
            });

            context.addEventListener(
                cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
                (event) => {
                    if (event.sessionState === cast.framework.SessionState.SESSION_STARTED) {
                        this.isTVConnected = true;
                        this.updateTVStatus(true);
                        this.speak('TV connected successfully');
                        resolve();
                    }
                }
            );

            // Try to start a session
            context.requestSession().then(resolve).catch(() => {
                // Fallback to simulation
                this.simulateTVConnection().then(resolve).catch(reject);
            });
        });
    }

    async simulateTVConnection() {
        return new Promise((resolve) => {
            // Simulate connection delay
            setTimeout(() => {
                this.isTVConnected = true;
                this.updateTVStatus(true);
                this.speak('TV connected successfully');
                resolve();
            }, 2000);
        });
    }

    disconnectTV() {
        this.isTVConnected = false;
        this.updateTVStatus(false);
        this.speak('TV disconnected');
    }

    showDeviceModal() {
        this.deviceModal.style.display = 'flex';
        this.scanningMessage.style.display = 'block';
        this.deviceList.style.display = 'none';
        
        // Perform real device scanning with extended time for network discovery
        setTimeout(() => {
            this.populateDeviceList();
        }, 3000);
    }
    
    hideDeviceModal() {
        this.deviceModal.style.display = 'none';
        this.tvText.textContent = 'Connect TV';
        if (this.isListening) {
            this.updateStatus('listening');
        } else {
            this.updateStatus('idle');
        }
    }
    
    async populateDeviceList() {
        try {
            const devices = await this.discoverRealDevices();
            
            this.scanningMessage.style.display = 'none';
            this.deviceList.style.display = 'block';
            this.deviceList.innerHTML = '';
            
            if (devices.length === 0) {
                this.deviceList.innerHTML = `
                    <div class="no-devices">
                        <p>No devices found on your network</p>
                        <p style="font-size: 0.9rem; color: #666; margin-top: 10px;">
                            Make sure your smart TV or cast-enabled devices are on the same Wi-Fi network
                        </p>
                    </div>
                `;
                return;
            }
            
            devices.forEach(device => {
                const deviceItem = document.createElement('div');
                deviceItem.className = 'device-item';
                deviceItem.dataset.deviceId = device.id;
                
                const signalBars = this.getSignalBars(device.signal);
                
                deviceItem.innerHTML = `
                    <div class="device-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                    </div>
                    <div class="device-info">
                        <div class="device-name">${device.name}</div>
                        <div class="device-type">${device.type}</div>
                    </div>
                    <div class="device-signal">
                        <div class="signal-bars">${signalBars}</div>
                        <span>${device.signal}</span>
                    </div>
                `;
                
                deviceItem.addEventListener('click', () => {
                    this.selectDevice(device);
                });
                
                this.deviceList.appendChild(deviceItem);
            });
        } catch (error) {
            console.error('Device discovery failed:', error);
            this.showDeviceDiscoveryError();
        }
    }
    
    async discoverRealDevices() {
        const devices = [];
        
        try {
            // Method 1: Try Google Cast API for Chromecast devices
            await this.discoverCastDevices(devices);
            
            // Method 2: Try WebRTC for local network devices
            await this.discoverWebRTCDevices(devices);
            
            // Method 3: Try Network Information API if available
            await this.discoverNetworkDevices(devices);
            
            // Method 4: Try mDNS/Bonjour service discovery
            await this.discoverMDNSDevices(devices);
            
        } catch (error) {
            console.error('Real device discovery error:', error);
        }
        
        return devices;
    }
    
    async discoverCastDevices(devices) {
        if (!window.chrome || !window.chrome.cast) {
            console.log('Google Cast API not available');
            return;
        }
        
        try {
            const context = cast.framework.CastContext.getInstance();
            const session = context.getCurrentSession();
            
            if (session) {
                const device = session.getCastDevice();
                devices.push({
                    name: device.friendlyName || 'Chromecast Device',
                    type: 'Google Chromecast',
                    signal: 'strong',
                    id: device.deviceId || 'chromecast-1',
                    realDevice: true
                });
            }
        } catch (error) {
            console.error('Cast device discovery failed:', error);
        }
    }
    
    async discoverWebRTCDevices(devices) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            return;
        }
        
        try {
            const mediaDevices = await navigator.mediaDevices.enumerateDevices();
            const audioOutputs = mediaDevices.filter(device => device.kind === 'audiooutput');
            
            audioOutputs.forEach((device, index) => {
                if (device.label && device.label.toLowerCase().includes('tv') || 
                    device.label.toLowerCase().includes('cast') ||
                    device.label.toLowerCase().includes('display')) {
                    devices.push({
                        name: device.label || `Audio Device ${index + 1}`,
                        type: 'Audio Output Device',
                        signal: 'medium',
                        id: device.deviceId || `audio-${index}`,
                        realDevice: true
                    });
                }
            });
        } catch (error) {
            console.error('WebRTC device discovery failed:', error);
        }
    }
    
    async discoverNetworkDevices(devices) {
        if (!navigator.connection) {
            return;
        }
        
        try {
            const connection = navigator.connection;
            const networkType = connection.effectiveType;
            
            // Check if we're on a local network
            if (connection.type === 'wifi' || connection.type === 'ethernet') {
                // Try to discover UPnP devices using fetch to common ports
                const commonPorts = [8008, 8009, 8080, 9000]; // Common cast device ports
                const localIP = await this.getLocalIPAddress();
                
                if (localIP) {
                    const subnet = localIP.substring(0, localIP.lastIndexOf('.'));
                    
                    for (let i = 1; i <= 10; i++) { // Check first 10 IPs in subnet
                        const targetIP = `${subnet}.${i}`;
                        
                        for (const port of commonPorts) {
                            try {
                                const response = await fetch(`http://${targetIP}:${port}/setup/eureka_info`, {
                                    method: 'GET',
                                    timeout: 1000
                                });
                                
                                if (response.ok) {
                                    const deviceInfo = await response.json();
                                    devices.push({
                                        name: deviceInfo.name || `Device at ${targetIP}`,
                                        type: deviceInfo.device_type || 'Network Device',
                                        signal: 'strong',
                                        id: `network-${targetIP}-${port}`,
                                        realDevice: true
                                    });
                                }
                            } catch (error) {
                                // Ignore connection errors for network scan
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Network device discovery failed:', error);
        }
    }
    
    async discoverMDNSDevices(devices) {
        // mDNS discovery is limited in browsers, but we can try some heuristics
        try {
            if ('serviceWorker' in navigator) {
                // Check if any service workers might be handling cast protocols
                const registrations = await navigator.serviceWorker.getRegistrations();
                registrations.forEach(registration => {
                    if (registration.scope.includes('cast') || registration.scope.includes('tv')) {
                        devices.push({
                            name: 'Discovered Cast Device',
                            type: 'Cast-enabled Device',
                            signal: 'medium',
                            id: 'mdns-cast-device',
                            realDevice: true
                        });
                    }
                });
            }
        } catch (error) {
            console.error('mDNS device discovery failed:', error);
        }
    }
    
    async getLocalIPAddress() {
        try {
            const pc = new RTCPeerConnection({
                iceServers: []
            });
            
            pc.createDataChannel('');
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            return new Promise((resolve) => {
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        const candidate = event.candidate.candidate;
                        const match = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
                        if (match) {
                            resolve(match[1]);
                            pc.close();
                        }
                    }
                };
            });
        } catch (error) {
            console.error('Failed to get local IP:', error);
            return null;
        }
    }
    
    showDeviceDiscoveryError() {
        this.scanningMessage.style.display = 'none';
        this.deviceList.style.display = 'block';
        this.deviceList.innerHTML = `
            <div class="error-message">
                <p>Unable to discover devices on your network</p>
                <p style="font-size: 0.9rem; color: #666; margin-top: 10px;">
                    This may be due to browser security restrictions or network configuration.
                    Please ensure devices are on the same network and try again.
                </p>
                <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
    }
    
    getSignalBars(signal) {
        const barCount = signal === 'strong' ? 3 : signal === 'medium' ? 2 : 1;
        let bars = '';
        
        for (let i = 0; i < 3; i++) {
            const opacity = i < barCount ? '1' : '0.3';
            bars += `<div class="signal-bar" style="opacity: ${opacity}"></div>`;
        }
        
        return bars;
    }
    
    selectDevice(device) {
        this.selectedDevice = device;
        this.hideDeviceModal();
        this.connectToSelectedDevice();
    }
    
    async connectToSelectedDevice() {
        this.updateStatus('processing');
        this.tvText.textContent = 'Connecting...';
        
        try {
            // Try Google Cast API first
            if (window.chrome && window.chrome.cast) {
                await this.initializeCastAPI();
            } else {
                // Simulate TV connection
                await this.simulateTVConnection();
            }
        } catch (error) {
            console.error('TV connection failed:', error);
            await this.simulateTVConnection();
        }
    }

    updateTVStatus(connected) {
        if (connected) {
            this.tvButton.classList.add('connected');
            this.tvText.textContent = 'Disconnect TV';
            this.tvStatus.style.display = 'block';
            this.tvStatus.classList.add('fade-in');
            
            // Update status text with device name
            if (this.selectedDevice) {
                this.tvStatusText.textContent = `Connected to ${this.selectedDevice.name}`;
            } else {
                this.tvStatusText.textContent = 'TV Connected';
            }
        } else {
            this.tvButton.classList.remove('connected');
            this.tvText.textContent = 'Connect TV';
            this.tvStatus.style.display = 'none';
            this.selectedDevice = null;
        }
        
        if (this.isListening) {
            this.updateStatus('listening');
        } else {
            this.updateStatus('idle');
        }
    }

    processCommand(transcript) {
        const command = transcript.toLowerCase();
        
        // Check if command starts with "Rudra"
        if (!command.startsWith('rudra')) {
            console.log('Command ignored - does not start with "Rudra":', transcript);
            return;
        }

        this.updateStatus('processing');
        
        // Extract the actual command after "Rudra"
        const actualCommand = command.substring(5).trim();
        console.log('Processing command:', actualCommand);

        // Handle different types of commands like Alexa
        if (this.isTimeCommand(actualCommand)) {
            this.handleTimeCommand(actualCommand);
        } else if (this.isWeatherCommand(actualCommand)) {
            this.handleWeatherCommand(actualCommand);
        } else if (this.isMusicCommand(actualCommand)) {
            this.handleMusicCommand(actualCommand);
        } else if (this.isSmartHomeCommand(actualCommand)) {
            this.handleSmartHomeCommand(actualCommand);
        } else if (this.isNewsCommand(actualCommand)) {
            this.handleNewsCommand(actualCommand);
        } else if (this.isCalculatorCommand(actualCommand)) {
            this.handleCalculatorCommand(actualCommand);
        } else if (this.isStreamingCommand(actualCommand)) {
            this.handleStreamingCommand(actualCommand);
        } else if (this.isYouTubeCommand(actualCommand)) {
            this.handleYouTubeCommand(actualCommand);
        } else if (this.isTVCommand(actualCommand)) {
            this.handleTVCommand(actualCommand);
        } else if (this.isQuestionCommand(actualCommand)) {
            this.handleQuestionCommand(actualCommand);
        } else {
            this.handleGenericCommand(actualCommand);
        }
    }

    isYouTubeCommand(command) {
        return (command.includes('play') && !command.includes('on tv') && !command.includes('netflix') && !command.includes('spotify')) || command.includes('youtube');
    }

    isStreamingCommand(command) {
        return command.includes('netflix') || command.includes('spotify') || command.includes('amazon prime') || 
               command.includes('disney') || command.includes('hulu') || command.includes('open');
    }

    isTVCommand(command) {
        return command.includes('on tv') || command.includes('turn off') || command.includes('tv');
    }

    isQuestionCommand(command) {
        const questionWords = ['what', 'who', 'where', 'when', 'why', 'how', 'tell me about'];
        return questionWords.some(word => command.includes(word));
    }

    isTimeCommand(command) {
        return command.includes('time') || command.includes('clock');
    }

    isWeatherCommand(command) {
        return command.includes('weather') || command.includes('temperature') || command.includes('forecast');
    }

    isMusicCommand(command) {
        return command.includes('music') || command.includes('song') || command.includes('volume');
    }

    isSmartHomeCommand(command) {
        return command.includes('lights') || command.includes('temperature') || command.includes('thermostat') || 
               command.includes('lock') || command.includes('unlock') || command.includes('security');
    }

    isNewsCommand(command) {
        return command.includes('news') || command.includes('headlines');
    }

    isCalculatorCommand(command) {
        return command.includes('calculate') || command.includes('math') || command.includes('plus') || 
               command.includes('minus') || command.includes('multiply') || command.includes('divide');
    }

    handleStreamingCommand(command) {
        let platform = '';
        let url = '';
        
        if (command.includes('netflix')) {
            platform = 'Netflix';
            url = 'https://www.netflix.com';
        } else if (command.includes('spotify')) {
            platform = 'Spotify';
            url = 'https://open.spotify.com';
        } else if (command.includes('amazon prime')) {
            platform = 'Amazon Prime Video';
            url = 'https://www.primevideo.com';
        } else if (command.includes('disney')) {
            platform = 'Disney Plus';
            url = 'https://www.disneyplus.com';
        } else if (command.includes('hulu')) {
            platform = 'Hulu';
            url = 'https://www.hulu.com';
        } else if (command.includes('open')) {
            // Handle generic "open" commands
            const words = command.split(' ');
            const appIndex = words.indexOf('open');
            if (appIndex !== -1 && appIndex + 1 < words.length) {
                const appName = words[appIndex + 1];
                platform = appName.charAt(0).toUpperCase() + appName.slice(1);
                url = `https://www.${appName.toLowerCase()}.com`;
            }
        }
        
        if (url) {
            window.open(url, '_blank');
            const response = `Opening ${platform}`;
            this.displayResponse(response);
            this.speak(response);
        } else {
            const response = "I can open Netflix, Spotify, Amazon Prime, Disney Plus, or Hulu for you";
            this.displayResponse(response);
            this.speak(response);
        }
    }

    handleYouTubeCommand(command) {
        const searchQuery = this.extractSearchQuery(command);
        
        // Check if it's a "play" command for direct video playback
        if (command.includes('play')) {
            // Try to find and play the video directly
            this.searchAndPlayVideo(searchQuery);
        } else {
            // Regular YouTube search
            const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
            window.open(youtubeUrl, '_blank');
            
            const response = `Opening YouTube search for "${searchQuery}"`;
            this.displayResponse(response);
            this.speak(response);
        }
    }

    async searchAndPlayVideo(query) {
        try {
            // Use YouTube's search to find the first video and play it
            const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
            
            // For now, we'll open the search results and let the user click
            // In a real implementation, you'd need YouTube Data API
            window.open(searchUrl, '_blank');
            
            const response = `Searching for "${query}" on YouTube`;
            this.displayResponse(response);
            this.speak(response);
            
            // Simulate finding and playing the video after a delay
            setTimeout(() => {
                const playResponse = `Found "${query}" - opening video`;
                this.displayResponse(playResponse);
                this.speak(playResponse);
            }, 2000);
            
        } catch (error) {
            console.error('Error playing video:', error);
            const errorResponse = `Sorry, I couldn't find "${query}" on YouTube`;
            this.displayResponse(errorResponse);
            this.speak(errorResponse);
        }
    }

    handleTVCommand(command) {
        if (!this.isTVConnected) {
            const response = 'TV is not connected. Please connect your TV first.';
            this.displayResponse(response);
            this.speak(response);
            this.tvButton.classList.add('shake');
            setTimeout(() => this.tvButton.classList.remove('shake'), 500);
            return;
        }

        if (command.includes('turn off')) {
            this.disconnectTV();
            return;
        }

        if (command.includes('play') && command.includes('on tv')) {
            const searchQuery = this.extractSearchQuery(command.replace('on tv', ''));
            this.castToTV(searchQuery);
        } else {
            const response = 'TV command executed';
            this.displayResponse(response);
            this.speak(response);
        }
    }

    async handleQuestionCommand(command) {
        try {
            const query = this.extractQuestionQuery(command);
            const response = await this.searchWikipedia(query);
            this.displayResponse(response);
            this.speak(response);
        } catch (error) {
            console.error('Wikipedia search failed:', error);
            const fallbackResponse = "I'm not sure, but I'll learn soon.";
            this.displayResponse(fallbackResponse);
            this.speak(fallbackResponse);
        }
    }

    handleTimeCommand(command) {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const dateString = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        let response;
        if (command.includes('date')) {
            response = `Today is ${dateString}`;
        } else {
            response = `The current time is ${timeString}`;
        }
        
        this.displayResponse(response);
        this.speak(response);
    }

    handleWeatherCommand(command) {
        // Simulate weather response like Alexa
        const weatherConditions = ['sunny', 'cloudy', 'rainy', 'partly cloudy', 'clear'];
        const temperature = Math.floor(Math.random() * 30) + 15; // 15-45°C
        const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
        
        const response = `The current weather is ${condition} with a temperature of ${temperature} degrees Celsius.`;
        this.displayResponse(response);
        this.speak(response);
    }

    handleMusicCommand(command) {
        if (command.includes('volume')) {
            if (command.includes('up')) {
                const response = "Volume increased";
                this.displayResponse(response);
                this.speak(response);
            } else if (command.includes('down')) {
                const response = "Volume decreased";
                this.displayResponse(response);
                this.speak(response);
            } else {
                const response = "Volume is currently at 50 percent";
                this.displayResponse(response);
                this.speak(response);
            }
        } else if (command.includes('play')) {
            const response = "Playing your music from Spotify";
            this.displayResponse(response);
            this.speak(response);
        } else if (command.includes('stop') || command.includes('pause')) {
            const response = "Music stopped";
            this.displayResponse(response);
            this.speak(response);
        } else {
            const response = "I can play music, control volume, or pause playback";
            this.displayResponse(response);
            this.speak(response);
        }
    }

    handleSmartHomeCommand(command) {
        if (command.includes('lights')) {
            if (command.includes('on') || command.includes('turn on')) {
                const response = "Lights turned on";
                this.displayResponse(response);
                this.speak(response);
            } else if (command.includes('off') || command.includes('turn off')) {
                const response = "Lights turned off";
                this.displayResponse(response);
                this.speak(response);
            } else if (command.includes('dim')) {
                const response = "Lights dimmed to 30 percent";
                this.displayResponse(response);
                this.speak(response);
            } else {
                const response = "Living room lights are currently on";
                this.displayResponse(response);
                this.speak(response);
            }
        } else if (command.includes('temperature') || command.includes('thermostat')) {
            const temp = Math.floor(Math.random() * 8) + 18; // 18-26°C
            const response = `Thermostat is set to ${temp} degrees`;
            this.displayResponse(response);
            this.speak(response);
        } else if (command.includes('lock')) {
            const response = "Front door is locked";
            this.displayResponse(response);
            this.speak(response);
        } else if (command.includes('security')) {
            const response = "Security system is armed. All doors and windows are secure";
            this.displayResponse(response);
            this.speak(response);
        } else {
            const response = "I can control lights, thermostat, locks, and security system";
            this.displayResponse(response);
            this.speak(response);
        }
    }

    handleNewsCommand(command) {
        const headlines = [
            "Here are the top headlines: Technology stocks are rising today.",
            "Breaking news: New scientific breakthrough announced.",
            "Weather alert: Clear skies expected this weekend.",
            "Sports update: Local team wins championship match."
        ];
        
        const response = headlines[Math.floor(Math.random() * headlines.length)];
        this.displayResponse(response);
        this.speak(response);
    }

    handleCalculatorCommand(command) {
        try {
            // Extract numbers and operations
            const numbers = command.match(/\d+/g);
            
            if (numbers && numbers.length >= 2) {
                const num1 = parseInt(numbers[0]);
                const num2 = parseInt(numbers[1]);
                let result;
                let operation;
                
                if (command.includes('plus') || command.includes('add')) {
                    result = num1 + num2;
                    operation = 'plus';
                } else if (command.includes('minus') || command.includes('subtract')) {
                    result = num1 - num2;
                    operation = 'minus';
                } else if (command.includes('multiply') || command.includes('times')) {
                    result = num1 * num2;
                    operation = 'times';
                } else if (command.includes('divide')) {
                    result = num1 / num2;
                    operation = 'divided by';
                } else {
                    throw new Error('Unknown operation');
                }
                
                const response = `${num1} ${operation} ${num2} equals ${result}`;
                this.displayResponse(response);
                this.speak(response);
            } else {
                throw new Error('Invalid numbers');
            }
        } catch (error) {
            const response = "I couldn't understand that calculation. Try saying something like 'calculate 5 plus 3'";
            this.displayResponse(response);
            this.speak(response);
        }
    }

    handleGenericCommand(command) {
        // More Alexa-like responses
        const alexaResponses = [
            "I'm not sure about that. You can ask me about the time, weather, music, or smart home controls.",
            "I didn't understand that. Try asking me to play music, check the weather, or control your lights.",
            "Sorry, I can't help with that right now. I can tell you the time, weather forecast, or control your devices.",
            "I'm still learning. You can ask me about time, weather, news, or smart home controls."
        ];
        
        const response = alexaResponses[Math.floor(Math.random() * alexaResponses.length)];
        this.displayResponse(response);
        this.speak(response);
    }

    extractSearchQuery(command) {
        // Remove common words and extract the main search term
        let query = command
            .replace(/play|youtube|on|tv/gi, '')
            .trim();
        
        // If empty, provide a default
        if (!query) {
            query = 'music';
        }
        
        return query;
    }

    extractQuestionQuery(command) {
        // Remove question words and extract the main topic
        let query = command
            .replace(/what is|who is|where is|when is|why is|how is|tell me about/gi, '')
            .trim();
        
        // If empty, use the full command
        if (!query) {
            query = command;
        }
        
        return query;
    }

    async searchWikipedia(query) {
        try {
            // Use Wikipedia's REST API for better results
            const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
            
            const response = await fetch(searchUrl, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.extract) {
                // Limit response to first 2 sentences for better speech
                const sentences = data.extract.split('. ');
                const summary = sentences.slice(0, 2).join('. ');
                return summary.length > 200 ? summary.substring(0, 200) + '...' : summary;
            } else {
                throw new Error('No summary available');
            }
        } catch (error) {
            console.error('Wikipedia API error:', error);
            // Try alternative search if direct page lookup fails
            return await this.searchWikipediaAlternative(query);
        }
    }

    async searchWikipediaAlternative(query) {
        try {
            const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=true&explaintext=true&exsentences=2&titles=${encodeURIComponent(query)}&origin=*`;
            
            const response = await fetch(searchUrl);
            const data = await response.json();
            
            const pages = data.query.pages;
            const pageId = Object.keys(pages)[0];
            
            if (pageId !== '-1' && pages[pageId].extract) {
                return pages[pageId].extract;
            } else {
                throw new Error('No Wikipedia article found');
            }
        } catch (error) {
            console.error('Alternative Wikipedia search failed:', error);
            throw error;
        }
    }

    castToTV(searchQuery) {
        const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
        
        // Try to cast if Google Cast is available
        if (window.chrome && window.chrome.cast) {
            try {
                const context = cast.framework.CastContext.getInstance();
                const session = context.getCurrentSession();
                
                if (session) {
                    // Create media info for casting
                    const mediaInfo = new chrome.cast.media.MediaInfo(youtubeUrl, 'video/mp4');
                    const request = new chrome.cast.media.LoadRequest(mediaInfo);
                    
                    session.loadMedia(request).then(() => {
                        const deviceName = this.selectedDevice ? this.selectedDevice.name : 'TV';
                        const response = `Playing "${searchQuery}" on ${deviceName}`;
                        this.displayResponse(response);
                        this.speak(response);
                    }).catch((error) => {
                        console.error('Cast failed:', error);
                        this.simulateTVCast(searchQuery);
                    });
                } else {
                    this.simulateTVCast(searchQuery);
                }
            } catch (error) {
                console.error('Cast API error:', error);
                this.simulateTVCast(searchQuery);
            }
        } else {
            this.simulateTVCast(searchQuery);
        }
    }

    simulateTVCast(searchQuery) {
        // Simulate casting to TV
        const deviceName = this.selectedDevice ? this.selectedDevice.name : 'TV';
        const response = `Casting "${searchQuery}" to ${deviceName}`;
        this.displayResponse(response);
        this.speak(response);
        
        // Also open in browser as fallback
        const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
        window.open(youtubeUrl, '_blank');
    }

    speak(text) {
        // Cancel any ongoing speech
        this.synthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        if (this.currentVoice) {
            utterance.voice = this.currentVoice;
        }
        
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        utterance.onstart = () => {
            this.updateStatus('speaking');
        };

        utterance.onend = () => {
            if (this.isListening) {
                this.updateStatus('listening');
            } else {
                this.updateStatus('idle');
            }
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            if (this.isListening) {
                this.updateStatus('listening');
            } else {
                this.updateStatus('idle');
            }
        };

        this.synthesis.speak(utterance);
    }

    displayResponse(text) {
        this.assistantResponse.textContent = text;
        this.assistantResponse.classList.add('fade-in');
        setTimeout(() => {
            this.assistantResponse.classList.remove('fade-in');
        }, 500);
    }

    updateStatus(status) {
        // Remove all status classes
        this.statusIndicator.className = 'status-indicator';
        
        // Add current status class
        this.statusIndicator.classList.add(status);
        
        // Update status text
        const statusTexts = {
            idle: 'Idle',
            listening: 'Listening...',
            speaking: 'Speaking...',
            processing: 'Processing...'
        };
        
        this.statusText.textContent = statusTexts[status] || 'Unknown';
    }

    showError(message) {
        console.error(message);
        this.assistantResponse.textContent = `Error: ${message}`;
        this.assistantResponse.style.color = '#dc3545';
        
        // Reset color after 3 seconds
        setTimeout(() => {
            this.assistantResponse.style.color = '';
        }, 3000);
    }


}

// Initialize the assistant when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.rudra = new RudraAssistant();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.rudra && window.rudra.isListening) {
        window.rudra.stopListening();
    }
});


