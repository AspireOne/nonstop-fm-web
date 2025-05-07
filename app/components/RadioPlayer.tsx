// components/RadioPlayer.tsx
import React, {useCallback, useEffect, useState} from 'react';
import {useRadioWebSocket} from '~/hooks/useRadioWebSocket';
import {useAudioPlayer} from '~/hooks/useAudioPlayer';
import {Button, Card, CardBody, Chip, Divider, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Progress, Spinner} from "@heroui/react";
import {FaBackwardStep, FaForwardStep, FaPause, FaPlay} from "react-icons/fa6";

interface RadioPlayerProps {
  radioId: string;
}

export const RadioPlayer: React.FC<RadioPlayerProps> = ({radioId}) => {
  const {
    radioState,
    isConnected,
    error: wsError,
    skipNext,
    skipPrevious
  } = useRadioWebSocket(radioId);

  const [animateTrack, setAnimateTrack] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Define a wrapped skipNext function with logging
  const handleSkipNext = useCallback(() => {
    console.log("Skip next triggered from RadioPlayer");
    skipNext();
  }, [skipNext]);

  const {
    isPlaying,
    isLoading,
    error: audioError,
    togglePlay
  } = useAudioPlayer(radioState, handleSkipNext);

  // Show loading state when block is being prepared
  const isBlockLoading = radioState?.status.status === "downloading" || radioState?.status.status === "generating";

  const nowPlaying = radioState?.block?.type === "song" ? "Track" : radioState?.block?.type === "sweeper" ? "Sweeper" : "Voiceover";
  
  // Check if songs need to be downloaded
  const songsRemaining = radioState ? radioState.totalSongs - radioState.totalDownloadedSongs : 0;
  const needsDownloading = songsRemaining > 0;

  // Show modal only once when radio is first connected and some songs need downloading (but not all)
  useEffect(() => {
    if (isConnected && radioState && needsDownloading && radioState.totalDownloadedSongs > 0 && !isModalOpen) {
      // Only show on initial connection with some songs remaining
      setIsModalOpen(true);
    }
  }, [isConnected, radioState?.totalDownloadedSongs]);

  // Trigger animation when track changes
  useEffect(() => {
    if (radioState?.block?.id) {
      setAnimateTrack(true);
      const timer = setTimeout(() => setAnimateTrack(false), 500);
      return () => clearTimeout(timer);
    }
  }, [radioState?.block?.id]);

  // Loading animation
  if (!isConnected) {
    return (
      <div
        className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary-200 to-primary-400 animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">📻</span>
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Connecting to Radio</h3>
            <p className="text-gray-500">Tuning into your station...</p>
          </div>
          {wsError && (
            <div className="text-red-500 mt-2 text-center max-w-xs">{wsError}</div>
          )}
        </div>
      </div>
    );
  }

  // Block access if no songs have been downloaded yet
  if (isConnected && radioState && radioState.totalDownloadedSongs === 0) {
    return (
      <>
        <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-md rounded-xl shadow-xl p-8 flex flex-col items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-warning-200 to-warning-400"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Songs Need to be Downloaded</h3>
              <p className="text-gray-600 mb-4">Your radio station cannot function until songs are downloaded.</p>
              <Button 
                color="primary" 
                onPress={() => setIsModalOpen(true)}
                size="lg"
              >
                Show Download Instructions
              </Button>
            </div>
          </div>
        </div>

        {/* Download Warning Modal - accessible from the button above */}
        <Modal
          scrollBehavior={"inside"}
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          placement="center"
          backdrop="blur"
          size="4xl"
          classNames={{
            base: "max-h-[98vh] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
            backdrop: "z-[100]",
            wrapper: "z-[101]"
          }}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  Manual Song Download Required
                </ModalHeader>
                <ModalBody>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                      <Chip color="warning" variant="flat">
                        {songsRemaining} songs need downloading
                      </Chip>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-gray-600">Downloaded songs:</span>
                      <span className="font-medium">
                        {radioState?.totalDownloadedSongs || 0}/{radioState?.totalSongs || 0} songs
                      </span>
                    </div>
                    
                    <Progress
                      value={radioState ? (radioState.totalDownloadedSongs / radioState.totalSongs) * 100 : 0}
                      color="primary"
                      size="md"
                      className="h-2"
                      showValueLabel={false}
                    />
                    
                    <p>
                      Your radio station won't function until songs are downloaded. Due to YouTube restrictions and content policies, our server cannot directly download the songs. You need to run a command in your terminal that will download the songs to your computer and then upload them to our server.
                    </p>
                    
                    <div className="flex flex-col gap-3 mt-2">
                      <div className="flex flex-col gap-2">
                        <div className="font-semibold text-sm flex justify-between">
                          <span>Run this command in your terminal:</span> 
                          <Button 
                            size="sm" 
                            variant="flat" 
                            color="primary"
                            onClick={() => navigator.clipboard.writeText("npx ai-fm-cli")}
                          >
                            Copy
                          </Button>
                        </div>
                        <Card className="bg-gray-50 p-2">
                          <code className="text-xs break-all">
                            npx ai-fm-cli
                          </code>
                        </Card>
                      </div>
                    </div>
                    
                    <div className="text-sm bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium mb-1">Instructions:</p>
                      <ol className="list-decimal list-inside space-y-1 text-gray-700">
                        <li>Copy the command for your operating system</li>
                        <li>Open a terminal/command prompt</li>
                        <li>Paste and run the command</li>
                        <li>Select this radio station</li>
                        <li>Install yt-dlp and ffmpeg if prompted using provided instructions</li>
                        <li>Wait for downloads to complete</li>
                        <li>Refresh this page when done</li>
                      </ol>
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      After running the command, return to this page and refresh once the downloads are complete.
                    </p>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button color="primary" onPress={onClose}>
                    I understand
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </>
    );
  }

  return (
    <>
      <Card
        className="w-full max-w-md mx-auto overflow-hidden backdrop-blur-md bg-white/90 border-none shadow-2xl rounded-3xl">
        {/* Radio Header */}
        {radioState && (
          <div className="relative">
            {/* Album Art Placeholder */}
            <div
              className="w-full h-28 bg-gradient-to-r from-primary-200 via-secondary-200 to-primary-300 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-full h-full">
                  {/* Audio Wave Animation */}
                  {isPlaying && (
                    <div className="flex items-center justify-center w-full h-full gap-1">
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className="bg-white/30 rounded-full w-1.5 h-8 animate-sound-wave"
                          style={{
                            animationDelay: `${i * 0.1}s`,
                            height: `${Math.max(20, Math.floor(Math.random() * 40))}px`
                          }}
                        ></div>
                      ))}
                    </div>
                  )}

                  {/* Station Logo */}
                  <div className="absolute bottom-0 left-0 p-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center mr-3">
                        <span className="text-xl">📻</span>
                      </div>
                      <div>
                        <h1 className="text-lg font-bold text-white drop-shadow-md">
                          {radioState.radioTitle}
                        </h1>
                        {radioState.radioDescription && (
                          <p className="text-xs text-white/80">{radioState.radioDescription}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Status Chip */}
            <div className="absolute top-3 right-3">
              <Chip
                size="sm"
                variant="flat"
                color={isPlaying ? "success" : "default"}
                className="backdrop-blur-md bg-white/30"
              >
                {isPlaying ? "ON AIR" : "PAUSED"}
              </Chip>
            </div>
          </div>
        )}

        {radioState && (
          <CardBody className="flex flex-col gap-5 p-6">
            {/* Current Track Display */}
            <div
              className={`flex flex-col gap-1 transition-all duration-300 ${
                animateTrack ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-medium text-primary-500 uppercase tracking-wider mb-1 line-clamp-1">
                    Now Playing • {nowPlaying}
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 line-clamp-1">{radioState.block.title}</h2>
                </div>

                <div
                  className="flex items-center justify-center min-w-[50px] h-[24px] rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                  {radioState.block.position + 1}/{radioState.totalBlocks}
                </div>
              </div>
            </div>

            {/* Track Progress / Loading */}
            {isBlockLoading ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" color="primary"/>
                    <span className="text-gray-600">
                      {radioState.status?.status === 'downloading'
                        ? 'Downloading track...'
                        : radioState.status?.status === 'generating'
                          ? 'Generating voiceover...'
                          : 'Preparing audio...'}
                    </span>
                  </div>
                  {radioState.status?.progress !== undefined && (
                    <span className="text-xs font-medium text-gray-500">
                      {Math.round(radioState.status.progress)}%
                    </span>
                  )}
                </div>

                {radioState.status?.progress !== undefined && (
                  <Progress
                    value={radioState.status.progress}
                    color="primary"
                    size="sm"
                    className="h-1"
                    isIndeterminate={radioState.status.progress === 0}
                  />
                )}
              </div>
            ) : (
              <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                {isPlaying && (
                  <div
                    className="h-full bg-primary-500 rounded-full animate-pulse"
                    style={{width: '100%', animationDuration: '2s'}}
                  ></div>
                )}
              </div>
            )}

            <Divider className="my-1"/>

            {/* Player Controls */}
            <div className="flex items-center justify-between gap-4">
              <Button
                isIconOnly
                onPress={skipPrevious}
                isDisabled={!radioState.hasPrev || isBlockLoading}
                variant="light"
                radius="full"
                size="lg"
                className="bg-gray-100/70 hover:bg-gray-200/70 text-gray-700"
              >
                <FaBackwardStep className="text-xl"/>
              </Button>

              <Button
                onPress={togglePlay}
                isDisabled={isBlockLoading}
                color="primary"
                size="lg"
                radius="full"
                className="min-w-[100px] h-[56px]"
                isLoading={isLoading}
              >
                {!isLoading && (
                  isPlaying ?
                    <FaPause className="text-2xl"/> :
                    <FaPlay className="text-2xl ml-1"/>
                )}
              </Button>

              <Button
                isIconOnly
                onPress={() => {
                  console.log("Next button clicked manually");
                  skipNext();
                }}
                isDisabled={!radioState.hasNext || isBlockLoading}
                variant="light"
                radius="full"
                size="lg"
                className="bg-gray-100/70 hover:bg-gray-200/70 text-gray-700"
              >
                <FaForwardStep className="text-xl"/>
              </Button>
            </div>

            {/* Error messages */}
            {(wsError || audioError) && (
              <div className="text-red-500 text-sm mt-2 text-center px-4 py-2 bg-red-50 rounded-lg">
                {wsError || audioError}
              </div>
            )}
          </CardBody>
        )}
      </Card>
      
      {/* Download Warning Modal */}
      <Modal
        scrollBehavior={"inside"}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        placement="center"
        backdrop="blur"
        size="4xl"
        classNames={{
          base: "max-h-[98vh]",
          backdrop: "z-[100]",
          wrapper: "z-[101]"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Manual Song Download Required
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                    <Chip color="warning" variant="flat">
                      {songsRemaining} songs need downloading
                    </Chip>
                    <Chip color="success" variant="flat" className="hidden sm:flex">
                      {radioState?.totalDownloadedSongs || 0} songs already downloaded
                    </Chip>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-gray-600">Downloaded songs:</span>
                    <span className="font-medium">
                      {radioState?.totalDownloadedSongs || 0}/{radioState?.totalSongs || 0} songs
                    </span>
                  </div>
                  
                  <Progress
                    value={radioState ? (radioState.totalDownloadedSongs / radioState.totalSongs) * 100 : 0}
                    color="primary"
                    size="md"
                    className="h-2"
                    showValueLabel={false}
                  />
                  
                  <p>
                    Your radio station mostly won&#39;t function properly until all songs are downloaded. Due to YouTube restrictions and content policies, our server cannot directly download the songs. You need to run a command in your terminal that will download the songs to your computer and then upload them to our server. This ensures we comply with content usage policies while still letting you enjoy your radio.
                  </p>
                  
                  <div className="flex flex-col gap-3 mt-2">
                    <div className="flex flex-col gap-2">
                      <div className="font-semibold text-sm flex justify-between">
                        <span>Run this command in your terminal:</span> 
                        <Button 
                          size="sm" 
                          variant="flat" 
                          color="primary"
                          onPress={() => navigator.clipboard.writeText("npx ai-fm-cli")}
                        >
                          Copy
                        </Button>
                      </div>
                      <Card className="bg-gray-50 p-2">
                        <code className="text-xs break-all">
                          npx ai-fm-cli
                        </code>
                      </Card>
                    </div>
                  </div>
                  
                  <div className="text-sm bg-gray-50 p-3 rounded-lg">
                    <p className="font-medium mb-1">Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-700">
                      <li>Copy the command for your operating system</li>
                      <li>Open a terminal/command prompt</li>
                      <li>Paste and run the command</li>
                      <li>Select this radio station</li>
                      <li>Install yt-dlp and ffmpeg if prompted using provided instructions</li>
                      <li>Wait for downloads to complete</li>
                      <li>Refresh this page when done</li>
                    </ol>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    After running the command, return to this page and refresh once the downloads are complete.
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onPress={onClose}>
                  I understand
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
