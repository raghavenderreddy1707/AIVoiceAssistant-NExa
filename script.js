/**
 * Enhanced NExa - AI Voice Assistant
 * A modern, feature-rich voice assistant with advanced UI and capabilities
 */

class EnhancedNExaAssistant {
  constructor() {
    this.isListening = false
    this.isTVConnected = false
    this.recognition = null
    this.synthesis = window.speechSynthesis
    this.currentVoice = null
    this.isDarkMode = false
    this.sessionStartTime = Date.now()
    this.stats = {
      commandsToday: 0,
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
    }

    // Load stats from localStorage
    this.loadStats()

    // DOM elements
    this.initializeElements()
    this.init()
  }

  initializeElements() {
    // Core elements
    this.micButton = document.getElementById("mic-button")
    this.tvButton = document.getElementById("tv-button")
    this.statusIndicator = document.getElementById("status-indicator")
    this.statusText = document.getElementById("status-text")
    this.statusSubtext = document.getElementById("status-subtext")
    this.statusDot = document.getElementById("status-dot")
    this.voiceInput = document.getElementById("voice-input")
    this.assistantResponse = document.getElementById("assistant-response")
    this.tvStatus = document.getElementById("tv-status")
    this.micText = document.getElementById("mic-text")
    this.tvText = document.getElementById("tv-text")
    this.tvStatusText = document.getElementById("tv-status-text")

    // New enhanced elements
    this.themeToggle = document.getElementById("theme-toggle")
    this.waveContainer = document.getElementById("wave-container")
    this.confidenceMeter = document.getElementById("confidence-meter")
    this.loadingOverlay = document.getElementById("loading-overlay")
    this.notificationContainer = document.getElementById("notification-container")

    // Quick action buttons
    this.weatherBtn = document.getElementById("weather-btn")
    this.timeBtn = document.getElementById("time-btn")
    this.musicBtn = document.getElementById("music-btn")
    this.newsBtn = document.getElementById("news-btn")

    // Response actions
    this.copyResponseBtn = document.getElementById("copy-response")
    this.repeatResponseBtn = document.getElementById("repeat-response")

    // Tab system
    this.tabButtons = document.querySelectorAll(".tab-btn")
    this.tabContents = document.querySelectorAll(".tab-content")

    // TV controls
    this.tvControlBtns = document.querySelectorAll(".tv-control-btn")
    this.disconnectTvBtn = document.getElementById("disconnect-tv")

    // Stats elements
    this.commandsTodayEl = document.getElementById("commands-today")
    this.totalCommandsEl = document.getElementById("total-commands")
    this.successRateEl = document.getElementById("success-rate")
    this.uptimeEl = document.getElementById("uptime")
  }

  async init() {
    // Show loading overlay
    this.showLoading()

    try {
      // Check for Web Speech API support
      if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
        throw new Error("Web Speech API not supported in this browser. Please use Chrome or Edge.")
      }

      await this.setupSpeechRecognition()
      this.setupEventListeners()
      this.setupVoices()
      this.setupTheme()
      this.updateStatus("idle")
      this.updateStats()
      this.startUptimeCounter()

      // Hide loading overlay
      setTimeout(() => {
        this.hideLoading()
        this.showNotification("NExa initialized successfully!", "success")
      }, 2000)

      console.log("Enhanced NExa Assistant initialized successfully")
    } catch (error) {
      this.hideLoading()
      this.showError(error.message)
      this.showNotification("Failed to initialize NExa", "error")
    }
  }

  setupSpeechRecognition() {
    return new Promise((resolve) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      this.recognition = new SpeechRecognition()

      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = "en-US"

      this.recognition.onstart = () => {
        console.log("Speech recognition started")
        this.updateStatus("listening")
      }

      this.recognition.onresult = (event) => {
        let finalTranscript = ""
        let interimTranscript = ""
        let confidence = 0

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          confidence = Math.max(confidence, event.results[i][0].confidence || 0)

          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        // Update confidence meter
        this.updateConfidenceMeter(confidence)

        // Display interim results
        if (interimTranscript) {
          this.displayVoiceInput(interimTranscript, false)
        }

        // Process final results
        if (finalTranscript) {
          this.displayVoiceInput(finalTranscript, true)
          this.processCommand(finalTranscript.trim())
        }
      }

      this.recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error)
        if (event.error === "no-speech") {
          return
        }
        this.showError(`Speech recognition error: ${event.error}`)
        this.stopListening()
        this.stats.failedCommands++
        this.updateStats()
      }

      this.recognition.onend = () => {
        console.log("Speech recognition ended")
        if (this.isListening) {
          setTimeout(() => {
            try {
              this.recognition.start()
            } catch (error) {
              console.log("Recognition restart failed:", error)
            }
          }, 100)
        } else {
          this.updateStatus("idle")
        }
      }

      resolve()
    })
  }

  setupVoices() {
    const setVoice = () => {
      const voices = this.synthesis.getVoices()
      this.currentVoice =
        voices.find(
          (voice) =>
            voice.lang.startsWith("en") &&
            (voice.name.toLowerCase().includes("female") ||
              voice.name.toLowerCase().includes("zira") ||
              voice.name.toLowerCase().includes("samantha")),
        ) ||
        voices.find((voice) => voice.lang.startsWith("en")) ||
        voices[0]
    }

    if (this.synthesis.getVoices().length > 0) {
      setVoice()
    } else {
      this.synthesis.addEventListener("voiceschanged", setVoice)
    }
  }

  setupEventListeners() {
    // Core functionality
    this.micButton.addEventListener("click", () => this.toggleListening())
    this.tvButton.addEventListener("click", () => this.toggleTVConnection())
    this.themeToggle.addEventListener("click", () => this.toggleTheme())

    // Quick actions
    this.weatherBtn.addEventListener("click", () => this.handleQuickAction("weather"))
    this.timeBtn.addEventListener("click", () => this.handleQuickAction("time"))
    this.musicBtn.addEventListener("click", () => this.handleQuickAction("music"))
    this.newsBtn.addEventListener("click", () => this.handleQuickAction("news"))

    // Response actions
    this.copyResponseBtn.addEventListener("click", () => this.copyResponse())
    this.repeatResponseBtn.addEventListener("click", () => this.repeatLastResponse())

    // Tab system
    this.tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => this.switchTab(btn.dataset.tab))
    })

    // TV controls
    this.tvControlBtns.forEach((btn) => {
      btn.addEventListener("click", () => this.handleTVControl(btn.dataset.command))
    })

    if (this.disconnectTvBtn) {
      this.disconnectTvBtn.addEventListener("click", () => this.disconnectTV())
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "m":
            e.preventDefault()
            this.toggleListening()
            break
          case "t":
            e.preventDefault()
            this.toggleTVConnection()
            break
          case "d":
            e.preventDefault()
            this.toggleTheme()
            break
        }
      }

      // Space bar for quick mic toggle
      if (e.code === "Space" && !e.target.matches("input, textarea")) {
        e.preventDefault()
        this.toggleListening()
      }
    })

    // Page visibility change
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.isListening) {
        console.log("Tab hidden but continuing to listen")
      }
    })
  }

  setupTheme() {
    // Load saved theme
    const savedTheme = localStorage.getItem("nexa-theme") || "light"
    this.isDarkMode = savedTheme === "dark"
    this.applyTheme()
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode
    this.applyTheme()
    localStorage.setItem("nexa-theme", this.isDarkMode ? "dark" : "light")
    this.showNotification(`Switched to ${this.isDarkMode ? "dark" : "light"} mode`, "info")
  }

  applyTheme() {
    document.documentElement.setAttribute("data-theme", this.isDarkMode ? "dark" : "light")
  }

  showLoading() {
    this.loadingOverlay.style.display = "flex"
  }

  hideLoading() {
    this.loadingOverlay.style.display = "none"
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div")
    notification.className = `notification ${type}`
    notification.textContent = message

    this.notificationContainer.appendChild(notification)

    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease-in forwards"
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 3000)
  }

  updateConfidenceMeter(confidence) {
    const confidenceBar = this.confidenceMeter.querySelector(".confidence-bar")
    if (confidenceBar) {
      confidenceBar.style.width = `${confidence * 100}%`
    }
  }

  displayVoiceInput(text, isFinal = false) {
    this.voiceInput.innerHTML = `<p>${text}</p>`
    if (isFinal) {
      this.voiceInput.classList.add("active")
    }
  }

  toggleListening() {
    if (this.isListening) {
      this.stopListening()
    } else {
      this.startListening()
    }
  }

  startListening() {
    try {
      this.isListening = true
      this.recognition.start()
      this.micButton.classList.add("active")
      this.micText.textContent = "Stop Listening"
      this.displayVoiceInput('Listening for "NExa" commands...', false)
      this.updateStatus("listening")
      this.showNotification("Voice recognition started", "success")
    } catch (error) {
      console.error("Failed to start listening:", error)
      this.showError("Failed to start voice recognition")
      this.isListening = false
      this.showNotification("Failed to start voice recognition", "error")
    }
  }

  stopListening() {
    this.isListening = false
    this.recognition.stop()
    this.micButton.classList.remove("active")
    this.micText.textContent = "Start Listening"
    this.voiceInput.innerHTML =
      '<div class="placeholder-text"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg><p>Say "NExa" followed by your command...</p></div>'
    this.voiceInput.classList.remove("active")
    this.updateStatus("idle")
    this.updateConfidenceMeter(0)
  }

  async toggleTVConnection() {
    if (this.isTVConnected) {
      this.disconnectTV()
    } else {
      await this.connectTV()
    }
  }

  async connectTV() {
    this.updateStatus("processing")
    this.tvText.textContent = "Connecting..."
    this.showNotification("Connecting to TV...", "info")

    // Simulate TV connection
    setTimeout(() => {
      this.isTVConnected = true
      this.updateTVStatus(true)
      this.speak("TV connected successfully")
      this.showNotification("TV connected successfully", "success")
    }, 2000)
  }

  disconnectTV() {
    this.isTVConnected = false
    this.updateTVStatus(false)
    this.speak("TV disconnected")
    this.showNotification("TV disconnected", "info")
  }

  updateTVStatus(connected) {
    if (connected) {
      this.tvButton.classList.add("connected")
      this.tvText.textContent = "Connected"
      this.tvStatus.style.display = "block"
      this.tvStatus.classList.add("fade-in")
      this.tvStatusText.textContent = "Smart TV Connected"
    } else {
      this.tvButton.classList.remove("connected")
      this.tvText.textContent = "Connect TV"
      this.tvStatus.style.display = "none"
    }

    if (this.isListening) {
      this.updateStatus("listening")
    } else {
      this.updateStatus("idle")
    }
  }

  handleQuickAction(action) {
    const commands = {
      weather: "NExa, what's the weather?",
      time: "NExa, what time is it?",
      music: "NExa, play music",
      news: "NExa, what's the news?",
    }

    if (commands[action]) {
      this.displayVoiceInput(commands[action], true)
      this.processCommand(commands[action])
    }
  }

  handleTVControl(command) {
    if (!this.isTVConnected) {
      this.showNotification("TV not connected", "warning")
      this.tvButton.classList.add("shake")
      setTimeout(() => this.tvButton.classList.remove("shake"), 500)
      return
    }

    const response = `TV command: ${command}`
    this.displayResponse(response)
    this.speak(response)
    this.showNotification(`TV: ${command}`, "success")
  }

  copyResponse() {
    const responseText = this.assistantResponse.textContent
    if (responseText && responseText !== "Waiting for your command...") {
      navigator.clipboard
        .writeText(responseText)
        .then(() => {
          this.showNotification("Response copied to clipboard", "success")
        })
        .catch(() => {
          this.showNotification("Failed to copy response", "error")
        })
    }
  }

  repeatLastResponse() {
    const responseText = this.assistantResponse.textContent
    if (responseText && responseText !== "Waiting for your command...") {
      this.speak(responseText)
    }
  }

  switchTab(tabName) {
    // Update tab buttons
    this.tabButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabName)
    })

    // Update tab contents
    this.tabContents.forEach((content) => {
      content.classList.toggle("active", content.id === `${tabName}-tab`)
    })
  }

  processCommand(transcript) {
    const command = transcript.trim().toLowerCase()

    // Check if command starts with "NExa"
    if (!command.startsWith("nexa")) {
      console.log('Command ignored - does not start with "NExa":', transcript)
      return
    }

    this.updateStatus("processing")
    this.stats.totalCommands++
    this.stats.commandsToday++

    // Extract the actual command after "NExa"
    const actualCommand = command.replace(/^nexa\s*/, "")
    console.log("Processing command:", actualCommand)

    try {
      // Handle different types of commands
      if (this.isTimeCommand(actualCommand)) {
        this.handleTimeCommand(actualCommand)
      } else if (this.isWeatherCommand(actualCommand)) {
        this.handleWeatherCommand(actualCommand)
      } else if (this.isMusicCommand(actualCommand)) {
        this.handleMusicCommand(actualCommand)
      } else if (this.isSmartHomeCommand(actualCommand)) {
        this.handleSmartHomeCommand(actualCommand)
      } else if (this.isNewsCommand(actualCommand)) {
        this.handleNewsCommand(actualCommand)
      } else if (this.isCalculatorCommand(actualCommand)) {
        this.handleCalculatorCommand(actualCommand)
      } else if (this.isStreamingCommand(actualCommand)) {
        this.handleStreamingCommand(actualCommand)
      } else if (this.isYouTubeCommand(actualCommand)) {
        this.handleYouTubeCommand(actualCommand)
      } else if (this.isTVCommand(actualCommand)) {
        this.handleTVCommand(actualCommand)
      } else if (this.isQuestionCommand(actualCommand)) {
        this.handleQuestionCommand(actualCommand)
      } else {
        this.handleGenericCommand(actualCommand)
      }

      this.stats.successfulCommands++
    } catch (error) {
      console.error("Command processing error:", error)
      this.stats.failedCommands++
      this.showNotification("Command processing failed", "error")
    }

    this.updateStats()
    this.saveStats()
  }

  // Command type detection methods
  isTimeCommand(command) {
    return command.includes("time") || command.includes("clock") || command.includes("date")
  }

  isWeatherCommand(command) {
    return command.includes("weather") || command.includes("temperature") || command.includes("forecast")
  }

  isMusicCommand(command) {
    return command.includes("music") || command.includes("song") || command.includes("volume")
  }

  isSmartHomeCommand(command) {
    return (
      command.includes("lights") ||
      command.includes("temperature") ||
      command.includes("thermostat") ||
      command.includes("lock") ||
      command.includes("unlock") ||
      command.includes("security")
    )
  }

  isNewsCommand(command) {
    return command.includes("news") || command.includes("headlines")
  }

  isCalculatorCommand(command) {
    return (
      command.includes("calculate") ||
      command.includes("math") ||
      command.includes("plus") ||
      command.includes("minus") ||
      command.includes("multiply") ||
      command.includes("divide")
    )
  }

  isStreamingCommand(command) {
    return (
      command.includes("netflix") ||
      command.includes("spotify") ||
      command.includes("amazon prime") ||
      command.includes("disney") ||
      command.includes("hulu") ||
      command.includes("open")
    )
  }

  isYouTubeCommand(command) {
    return (
      (command.includes("play") &&
        !command.includes("on tv") &&
        !command.includes("netflix") &&
        !command.includes("spotify")) ||
      command.includes("youtube")
    )
  }

  isTVCommand(command) {
    return command.includes("on tv") || command.includes("turn off") || command.includes("tv")
  }

  isQuestionCommand(command) {
    const questionWords = ["what", "who", "where", "when", "why", "how", "tell me about"]
    return questionWords.some((word) => command.includes(word))
  }

  // Enhanced command handlers
  handleTimeCommand(command) {
    const now = new Date()
    const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    const dateString = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    let response
    if (command.includes("date")) {
      response = `Today is ${dateString}`
    } else {
      response = `The current time is ${timeString}`
    }

    this.displayResponse(response)
    this.speak(response)
    this.showNotification("Time/Date provided", "success")
  }

  handleWeatherCommand(command) {
    const weatherConditions = ["sunny", "cloudy", "rainy", "partly cloudy", "clear", "overcast"]
    const temperature = Math.floor(Math.random() * 30) + 15
    const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)]
    const humidity = Math.floor(Math.random() * 40) + 30
    const windSpeed = Math.floor(Math.random() * 20) + 5

    const response = `Current weather: ${condition} with ${temperature}°C. Humidity is ${humidity}% and wind speed is ${windSpeed} km/h.`
    this.displayResponse(response)
    this.speak(response)
    this.showNotification("Weather information provided", "success")
  }

  handleMusicCommand(command) {
    if (command.includes("volume")) {
      if (command.includes("up")) {
        const response = "Volume increased to 60%"
        this.displayResponse(response)
        this.speak(response)
      } else if (command.includes("down")) {
        const response = "Volume decreased to 40%"
        this.displayResponse(response)
        this.speak(response)
      } else {
        const response = "Current volume is 50%"
        this.displayResponse(response)
        this.speak(response)
      }
    } else if (command.includes("play")) {
      const response = "Playing your favorite playlist from Spotify"
      this.displayResponse(response)
      this.speak(response)
      // Simulate opening Spotify
      setTimeout(() => window.open("https://open.spotify.com", "_blank"), 1000)
    } else if (command.includes("stop") || command.includes("pause")) {
      const response = "Music paused"
      this.displayResponse(response)
      this.speak(response)
    } else {
      const response = "I can play music, control volume, or pause playback. What would you like to do?"
      this.displayResponse(response)
      this.speak(response)
    }
    this.showNotification("Music command executed", "success")
  }

  handleSmartHomeCommand(command) {
    if (command.includes("lights")) {
      if (command.includes("on") || command.includes("turn on")) {
        const response = "All lights turned on"
        this.displayResponse(response)
        this.speak(response)
      } else if (command.includes("off") || command.includes("turn off")) {
        const response = "All lights turned off"
        this.displayResponse(response)
        this.speak(response)
      } else if (command.includes("dim")) {
        const response = "Lights dimmed to 30%"
        this.displayResponse(response)
        this.speak(response)
      } else {
        const response = "Living room lights are currently on at 80% brightness"
        this.displayResponse(response)
        this.speak(response)
      }
    } else if (command.includes("temperature") || command.includes("thermostat")) {
      const temp = Math.floor(Math.random() * 8) + 18
      const response = `Thermostat set to ${temp}°C. Current temperature is ${temp - 1}°C`
      this.displayResponse(response)
      this.speak(response)
    } else if (command.includes("lock")) {
      const response = "All doors locked. Security system armed."
      this.displayResponse(response)
      this.speak(response)
    } else if (command.includes("security")) {
      const response = "Security system is active. All sensors are operational. No alerts detected."
      this.displayResponse(response)
      this.speak(response)
    } else {
      const response = "I can control lights, thermostat, locks, and security system. What would you like me to do?"
      this.displayResponse(response)
      this.speak(response)
    }
    this.showNotification("Smart home command executed", "success")
  }

  handleNewsCommand(command) {
    const headlines = [
      "Breaking: New AI breakthrough announced by tech companies",
      "Weather update: Clear skies expected this weekend across the region",
      "Technology: Major software update improves device performance",
      "Science: Researchers discover new sustainable energy solution",
      "Health: New study shows benefits of regular exercise and healthy diet",
    ]

    const randomHeadline = headlines[Math.floor(Math.random() * headlines.length)]
    const response = `Here's a top headline: ${randomHeadline}`
    this.displayResponse(response)
    this.speak(response)
    this.showNotification("News headline provided", "success")
  }

  handleCalculatorCommand(command) {
    try {
      const numbers = command.match(/\d+(\.\d+)?/g)

      if (numbers && numbers.length >= 2) {
        const num1 = Number.parseFloat(numbers[0])
        const num2 = Number.parseFloat(numbers[1])
        let result
        let operation

        if (command.includes("plus") || command.includes("add")) {
          result = num1 + num2
          operation = "plus"
        } else if (command.includes("minus") || command.includes("subtract")) {
          result = num1 - num2
          operation = "minus"
        } else if (command.includes("multiply") || command.includes("times")) {
          result = num1 * num2
          operation = "times"
        } else if (command.includes("divide")) {
          result = num1 / num2
          operation = "divided by"
        } else {
          throw new Error("Unknown operation")
        }

        const response = `${num1} ${operation} ${num2} equals ${result}`
        this.displayResponse(response)
        this.speak(response)
        this.showNotification("Calculation completed", "success")
      } else {
        throw new Error("Invalid numbers")
      }
    } catch (error) {
      const response = "I couldn't understand that calculation. Try saying something like 'calculate 15 plus 25'"
      this.displayResponse(response)
      this.speak(response)
      this.showNotification("Calculation failed", "warning")
    }
  }

  handleStreamingCommand(command) {
    let platform = ""
    let url = ""

    if (command.includes("netflix")) {
      platform = "Netflix"
      url = "https://www.netflix.com"
    } else if (command.includes("spotify")) {
      platform = "Spotify"
      url = "https://open.spotify.com"
    } else if (command.includes("amazon prime")) {
      platform = "Amazon Prime Video"
      url = "https://www.primevideo.com"
    } else if (command.includes("disney")) {
      platform = "Disney Plus"
      url = "https://www.disneyplus.com"
    } else if (command.includes("hulu")) {
      platform = "Hulu"
      url = "https://www.hulu.com"
    } else if (command.includes("open")) {
      const words = command.split(" ")
      const appIndex = words.indexOf("open")
      if (appIndex !== -1 && appIndex + 1 < words.length) {
        const appName = words[appIndex + 1]
        platform = appName.charAt(0).toUpperCase() + appName.slice(1)
        url = `https://www.${appName.toLowerCase()}.com`
      }
    }

    if (url) {
      window.open(url, "_blank")
      const response = `Opening ${platform}`
      this.displayResponse(response)
      this.speak(response)
      this.showNotification(`${platform} opened`, "success")
    } else {
      const response = "I can open Netflix, Spotify, Amazon Prime, Disney Plus, or Hulu for you"
      this.displayResponse(response)
      this.speak(response)
      this.showNotification("Streaming service not recognized", "warning")
    }
  }

  handleYouTubeCommand(command) {
    const searchQuery = this.extractSearchQuery(command)

    if (command.includes("play")) {
      this.searchAndPlayVideo(searchQuery)
    } else {
      const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`
      window.open(youtubeUrl, "_blank")

      const response = `Searching YouTube for "${searchQuery}"`
      this.displayResponse(response)
      this.speak(response)
      this.showNotification("YouTube search opened", "success")
    }
  }

  async searchAndPlayVideo(query) {
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
      window.open(searchUrl, "_blank")

      const response = `Searching for "${query}" on YouTube`
      this.displayResponse(response)
      this.speak(response)
      this.showNotification("YouTube video search started", "success")

      setTimeout(() => {
        const playResponse = `Found "${query}" - opening video`
        this.displayResponse(playResponse)
        this.speak(playResponse)
      }, 2000)
    } catch (error) {
      console.error("Error playing video:", error)
      const errorResponse = `Sorry, I couldn't find "${query}" on YouTube`
      this.displayResponse(errorResponse)
      this.speak(errorResponse)
      this.showNotification("YouTube search failed", "error")
    }
  }

  handleTVCommand(command) {
    if (!this.isTVConnected) {
      const response = "TV is not connected. Please connect your TV first."
      this.displayResponse(response)
      this.speak(response)
      this.tvButton.classList.add("shake")
      setTimeout(() => this.tvButton.classList.remove("shake"), 500)
      this.showNotification("TV not connected", "warning")
      return
    }

    if (command.includes("turn off")) {
      this.disconnectTV()
      return
    }

    if (command.includes("play") && command.includes("on tv")) {
      const searchQuery = this.extractSearchQuery(command.replace("on tv", ""))
      this.castToTV(searchQuery)
    } else {
      const response = "TV command executed successfully"
      this.displayResponse(response)
      this.speak(response)
      this.showNotification("TV command sent", "success")
    }
  }

  async handleQuestionCommand(command) {
    try {
      const query = this.extractQuestionQuery(command)
      const response = await this.searchWikipedia(query)
      this.displayResponse(response)
      this.speak(response)
      this.showNotification("Information retrieved", "success")
    } catch (error) {
      console.error("Wikipedia search failed:", error)
      const fallbackResponse = "I'm still learning about that topic. Please try asking something else."
      this.displayResponse(fallbackResponse)
      this.speak(fallbackResponse)
      this.showNotification("Information search failed", "warning")
    }
  }

  handleGenericCommand(command) {
    const responses = [
      "I'm not sure about that. You can ask me about time, weather, music, smart home controls, or general questions.",
      "I didn't understand that command. Try asking me to play music, check the weather, or control your devices.",
      "Sorry, I can't help with that right now. I can tell you the time, weather forecast, or control your smart home.",
      "I'm still learning. You can ask me about time, weather, news, calculations, or smart home controls.",
    ]

    const response = responses[Math.floor(Math.random() * responses.length)]
    this.displayResponse(response)
    this.speak(response)
    this.showNotification("Command not recognized", "warning")
  }

  extractSearchQuery(command) {
    let query = command.replace(/play|youtube|on|tv/gi, "").trim()

    if (!query) {
      query = "music"
    }

    return query
  }

  extractQuestionQuery(command) {
    let query = command.replace(/what is|who is|where is|when is|why is|how is|tell me about/gi, "").trim()

    if (!query) {
      query = command
    }

    return query
  }

  async searchWikipedia(query) {
    try {
      const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`

      const response = await fetch(searchUrl, {
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.extract) {
        const sentences = data.extract.split(". ")
        const summary = sentences.slice(0, 2).join(". ")
        return summary.length > 200 ? summary.substring(0, 200) + "..." : summary
      } else {
        throw new Error("No summary available")
      }
    } catch (error) {
      console.error("Wikipedia API error:", error)
      return await this.searchWikipediaAlternative(query)
    }
  }

  async searchWikipediaAlternative(query) {
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=true&explaintext=true&exsentences=2&titles=${encodeURIComponent(query)}&origin=*`

      const response = await fetch(searchUrl)
      const data = await response.json()

      const pages = data.query.pages
      const pageId = Object.keys(pages)[0]

      if (pageId !== "-1" && pages[pageId].extract) {
        return pages[pageId].extract
      } else {
        throw new Error("No Wikipedia article found")
      }
    } catch (error) {
      console.error("Alternative Wikipedia search failed:", error)
      throw error
    }
  }

  castToTV(searchQuery) {
    const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`

    // Simulate casting to TV
    const response = `Casting "${searchQuery}" to Smart TV`
    this.displayResponse(response)
    this.speak(response)
    this.showNotification(`Casting: ${searchQuery}`, "success")

    // Also open in browser as fallback
    window.open(youtubeUrl, "_blank")
  }

  speak(text) {
    // Cancel any ongoing speech
    this.synthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    if (this.currentVoice) {
      utterance.voice = this.currentVoice
    }

    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.volume = 0.8

    utterance.onstart = () => {
      this.updateStatus("speaking")
    }

    utterance.onend = () => {
      if (this.isListening) {
        this.updateStatus("listening")
      } else {
        this.updateStatus("idle")
      }
    }

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event)
      if (this.isListening) {
        this.updateStatus("listening")
      } else {
        this.updateStatus("idle")
      }
    }

    this.synthesis.speak(utterance)
  }

  displayResponse(text) {
    this.assistantResponse.innerHTML = `<p>${text}</p>`
    this.assistantResponse.classList.add("fade-in")
    setTimeout(() => {
      this.assistantResponse.classList.remove("fade-in")
    }, 500)
  }

  updateStatus(status) {
    // Remove all status classes
    this.statusIndicator.className = "status-indicator"

    // Add current status class
    this.statusIndicator.classList.add(status)

    // Update status text
    const statusTexts = {
      idle: "Ready to assist",
      listening: "Listening...",
      speaking: "Speaking...",
      processing: "Processing...",
    }

    const statusSubtexts = {
      idle: 'Say "NExa" to start',
      listening: "Speak your command",
      speaking: "Responding to you",
      processing: "Understanding command",
    }

    this.statusText.textContent = statusTexts[status] || "Unknown"
    this.statusSubtext.textContent = statusSubtexts[status] || ""
  }

  showError(message) {
    console.error(message)
    this.assistantResponse.innerHTML = `<p style="color: var(--error-color);">Error: ${message}</p>`

    // Reset after 5 seconds
    setTimeout(() => {
      this.assistantResponse.innerHTML =
        '<div class="placeholder-text"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><p>Waiting for your command...</p></div>'
    }, 5000)
  }

  // Statistics management
  loadStats() {
    const savedStats = localStorage.getItem("nexa-stats")
    if (savedStats) {
      this.stats = { ...this.stats, ...JSON.parse(savedStats) }
    }

    // Reset daily stats if it's a new day
    const lastDate = localStorage.getItem("nexa-last-date")
    const today = new Date().toDateString()
    if (lastDate !== today) {
      this.stats.commandsToday = 0
      localStorage.setItem("nexa-last-date", today)
    }
  }

  saveStats() {
    localStorage.setItem("nexa-stats", JSON.stringify(this.stats))
  }

  updateStats() {
    if (this.commandsTodayEl) {
      this.commandsTodayEl.textContent = this.stats.commandsToday
    }
    if (this.totalCommandsEl) {
      this.totalCommandsEl.textContent = this.stats.totalCommands
    }
    if (this.successRateEl) {
      const total = this.stats.successfulCommands + this.stats.failedCommands
      const rate = total > 0 ? Math.round((this.stats.successfulCommands / total) * 100) : 100
      this.successRateEl.textContent = `${rate}%`
    }
  }

  startUptimeCounter() {
    setInterval(() => {
      const uptime = Math.floor((Date.now() - this.sessionStartTime) / 1000 / 60 / 60)
      if (this.uptimeEl) {
        this.uptimeEl.textContent = `${uptime}h`
      }
    }, 60000) // Update every minute
  }
}

// Initialize the enhanced assistant when the page loads
document.addEventListener("DOMContentLoaded", () => {
  window.nexa = new EnhancedNExaAssistant()
})

// Handle page unload
window.addEventListener("beforeunload", () => {
  if (window.nexa && window.nexa.isListening) {
    window.nexa.stopListening()
  }
  if (window.nexa) {
    window.nexa.saveStats()
  }
})

// Add CSS animation for slideOut
const style = document.createElement("style")
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`
document.head.appendChild(style)
