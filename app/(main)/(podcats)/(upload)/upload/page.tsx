'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { generateReactHelpers } from '@uploadthing/react'

import MediaUploaderComponent from '@/components/MediaUploaderComponent'
import SelectCategoryComponent from '@/components/SelectCategoryComponent'
import { deletePodcast, getMyPodcasts, PublishPodcast } from '@/app/(actions)/actions'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { Loader, Podcast, Send, FileVideo, Link2, PlayCircle, Clock, Calendar, Heart, Headphones, PodcastIcon, User, Trash } from 'lucide-react'
import { getVideoTranscription } from '@/lib/AIAnalysisFunction'
import { set } from 'lodash'
import { PodcastType } from '@/lib/types'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import MinLoader from '@/components/MinLoader'
import Image from 'next/image'

const { uploadFiles } = generateReactHelpers();

export default function UploadPodcastPage() {
  const router = useRouter()

  const [topic, setTopic] = useState("Education")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [transcription, setTranscription] = useState<string>("")
  const [video, setVideo] = useState<File | null>(null)
  const [videoLink, setVideoLink] = useState("")
  const [thumbnail, setThumbnail] = useState<File[]>([])
  const [thumbnailLink, setThumbnailLink] = useState("")
  const [isPublishing, setIsPublishing] = useState(false)

  const [podcasts, setPodcasts] = useState<PodcastType[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  const extractYoutubeId = (url: string): string | null => {
    const regExp = /^.*(youtu\.be\/|v=|embed\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };


  const handleGetMyPodcasts = async () => {
    try {
      setLoading(true)
      const data = await getMyPodcasts()
      setPodcasts(data)
    } catch (error) {
      toast.error("Error while getting your podcasts.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    handleGetMyPodcasts()
  }, [])

  const handlePublish = async () => {
    if (!title || !description || (!video && !videoLink) || thumbnail.length === 0) {
      toast.error("Please fill in all required fields.")
      return
    }

    try {
      setIsPublishing(true)

      let finalVideoUrl = videoLink
      if (video) {
        const uploadedVideo = await uploadFiles('video', { files: [video] });
        finalVideoUrl = uploadedVideo[0].ufsUrl
      }

      let finalThumbnailUrl = thumbnailLink
      if (thumbnail.length > 0) {
        const uploadedThumb = await uploadFiles('image', { files: thumbnail });
        finalThumbnailUrl = uploadedThumb[0].ufsUrl
      }

      let videoUrlForTranscription = finalVideoUrl;
      if (videoUrlForTranscription.includes("youtube.com") || videoUrlForTranscription.includes("youtu.be")) {
        videoUrlForTranscription = `https://www.youtube.com/embed/${extractYoutubeId(videoUrlForTranscription)}`;
      }
      const videoTranscription = await getVideoTranscription(videoUrlForTranscription);
      setTranscription(videoTranscription);

      await PublishPodcast({
        title,
        description,
        videoUrl: finalVideoUrl,
        thumbnailUrl: finalThumbnailUrl,
        topic,
        transcription
      })

      toast.success("Podcast published successfully!")
      router.push('/podcasts')

    } catch (error) {
      console.error(error)
      toast.error("Error publishing podcast")
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDeletePodcast = (podcastId: string) => async () => {
    try {
      setLoading(false)
      await deletePodcast({ podcastId })
      toast.success("Podcast deleted successfully!")
      setPodcasts((prev) => prev.filter((podcast) => podcast.id !== podcastId))
    } catch (error) {
      toast.error("Error deleting podcast")
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <h2 className="text-3xl font-bold flex items-center gap-2 text-zinc-800 dark:text-white mb-2 mt-10">
        <Podcast className="text-orange-500" /> Upload Podcast
      </h2>

      {/* Form Card */}
      <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-zinc-800 p-6 shadow-lg border dark:border-zinc-700 space-y-6">

        {/* Title */}
        <Input
          disabled={isPublishing}
          placeholder="Title of your video..."
          className="rounded-xl p-4 dark:bg-zinc-900"
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Topic */}
        <SelectCategoryComponent category={topic} setCategory={setTopic} />

        {/* Description */}
        <Textarea
          disabled={isPublishing}
          placeholder="Description of your video..."
          className="rounded-xl p-4 dark:bg-zinc-900 resize-none"
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Video Input */}
        <Tabs defaultValue="video_file" className="w-full">
          <TabsList className="w-full grid grid-cols-2 rounded-xl">
            <TabsTrigger value="video_file" className="flex items-center gap-2">
              <FileVideo className="w-4 h-4" /> Upload File
            </TabsTrigger>
            <TabsTrigger value="video_url" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" /> Video URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="video_file">
            <div className="w-full p-4 border rounded-xl dark:border-zinc-700">
              <Input
                type="file"
                accept="video/*"
                disabled={isPublishing}
                onChange={(e) => setVideo(e.currentTarget.files?.[0] ?? null)}
              />
            </div>
          </TabsContent>

          <TabsContent value="video_url">
            <div className="w-full p-4 border rounded-xl dark:border-zinc-700">
              <Input
                placeholder="https://your-video-link.com"
                disabled={isPublishing}
                onChange={(e) => setVideoLink(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Thumbnail */}
        <MediaUploaderComponent setMediaFiles={setThumbnail} label="Thumbnail" />

        {/* Publish Button */}
        <div className="pt-4">
          <Button
            className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 font-semibold shadow-md hover:shadow-lg transition-all"
            disabled={isPublishing}
            onClick={handlePublish}
          >
            {isPublishing ? (
              <Loader className="animate-spin w-5 h-5 text-white" />
            ) : (
              <>Publish <Send className="ml-2 w-4 h-4" /></>
            )}
          </Button>
        </div>
      </div>

      <div className='mt-8 p-4 w-full'>
        <h4 className='text-xl text-center font-semibold mb-3' id="your-posts">Your Podcasts</h4>
        {
          podcasts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {
                podcasts.map((podcast, idx) => (
                  <Card
                    key={podcast.id}
                    className="p-0 overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 dark:bg-zinc-800 grid grid-cols-3 gap-0 items-center"
                  >
                    <div className="col-span-1 relative w-full h-full flex-1/2 rounded-4xl shadow-xl">
                      <Image
                        src={podcast.thumbnailUrl || "/default-thumbnail.png"}
                        alt={podcast.title}
                        fill
                        className="object-cover rounded-tr-4xl rounded-br-4xl"
                      />
                      <button 
                      onClick={() => window.open(`/podcasts/${podcast.id}`)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors rounded-tr-4xl rounded-br-4xl cursor-pointer">
                        <PlayCircle className="w-12 h-12 text-white" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1/2 col-span-2">
                      <span className="text-sm text-orange-500 font-medium">Episode No: {idx + 1}</span>
                      <h3 className="text-lg font-bold text-zinc-800 dark:text-white mt-2">{podcast.title}</h3>

                      <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400 mt-3 space-x-4">
                        <User className="w-4 h-4" />
                        <p className='line-clamp-1'>{podcast.description}</p>
                      </div>

                      <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400 mt-2 space-x-4">
                        <Clock className="w-4 h-4" />
                        <span>14</span>
                        <Calendar className="w-4 h-4 ml-4" />
                        <span>{new Date(podcast.updatedAt).toLocaleDateString()}</span>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-5">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1 text-zinc-600 dark:text-zinc-300">
                            <Heart className="w-4 h-4 text-red-500" />
                            <span>12</span>
                          </div>
                          <div className="flex items-center space-x-1 text-zinc-600 dark:text-zinc-300">
                            <Headphones className="w-4 h-4" />
                            <span>12</span>
                          </div>
                        </div>
                        <Button variant={"destructive"} onClick={handleDeletePodcast(podcast.id)} size="sm" className="text-white rounded-xl shadow-2xl">
                          <Trash className='w-4 h-4' />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              }

              <div
                className="w-full h-full flex items-center justify-center"
              >
                <Button asChild variant="outline" className="mt-6 md:mt-0 rounded-2xl w-7/10 p-4">
                  <Link href="/upload">
                    Publish your episodes <Send className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : !loading && (
            <div className='w-full flex flex-col items-center justify-center'>
              <PodcastIcon className='size-8 text-zinc-500' />
              <p className='text-zinc-500'>No podcasts found</p>
            </div>
          )
        }
      </div>

      {
        loading && (
          <div className="flex items-center justify-center w-full mt-8">
            <MinLoader />
          </div>
        )
      }
    </main>
  )
}