"use client"

import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: "default",
  variant: "default",
})

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("flex items-center justify-center gap-1", className)}
    {...props}
  >
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
))

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
})

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

export { ToggleGroup, ToggleGroupItem }


"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

// Define the event interface
interface Event {
  id: string
  timestamp: string // ISO string
  temperature: number
  precipitation: number
  windSpeed: number
  description: string
}

type TimeScale = "hour" | "day" | "week" | "month"
type DataPointDensity = "12" | "24" | "48" | "72"

export default function TimelineSlider() {
  // Sample events data - in a real app, this would come from an API
  const [allEvents, setAllEvents] = useState<Event[]>(() => generateSampleEvents())
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [currentDateTime, setCurrentDateTime] = useState(new Date(2025, 2, 11, 14, 30)) // March 11, 2025, 14:30
  const [isDragging, setIsDragging] = useState(false)
  const [sliderPosition, setSliderPosition] = useState(50) // Percentage position
  const [timeScale, setTimeScale] = useState<TimeScale>("day")
  const [dataPointDensity, setDataPointDensity] = useState<DataPointDensity>("24")
  const sliderRef = useRef<HTMLDivElement>(null)

  // Generate sample events data
  function generateSampleEvents(): Event[] {
    const events: Event[] = []
    const baseDate = new Date(2025, 0, 1) // Jan 1, 2025
    const endDate = new Date(2025, 11, 31) // Dec 31, 2025

    // Generate random events throughout the year
    const totalEvents = 500
    for (let i = 0; i < totalEvents; i++) {
      const randomTime = baseDate.getTime() + Math.random() * (endDate.getTime() - baseDate.getTime())
      const eventDate = new Date(randomTime)

      events.push({
        id: `event-${i}`,
        timestamp: eventDate.toISOString(),
        temperature: Math.floor(Math.random() * 30) + 5, // 5-35
        precipitation: Math.floor(Math.random() * 100), // 0-100
        windSpeed: Math.floor(Math.random() * 50), // 0-50
        description: `Weather event ${i}`,
      })
    }

    // Sort events by timestamp
    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }

  // Filter events based on current date and time scale
  useEffect(() => {
    const numPoints = Number.parseInt(dataPointDensity)
    const startDateTime = new Date(currentDateTime)
    const endDateTime = new Date(currentDateTime)

    // Adjust date range based on time scale and data point density
    if (timeScale === "hour") {
      startDateTime.setHours(startDateTime.getHours() - numPoints / 2)
      endDateTime.setHours(endDateTime.getHours() + numPoints / 2)
    } else if (timeScale === "day") {
      startDateTime.setDate(startDateTime.getDate() - numPoints / 2)
      endDateTime.setDate(endDateTime.getDate() + numPoints / 2)
    } else if (timeScale === "week") {
      startDateTime.setDate(startDateTime.getDate() - (numPoints / 2) * 7)
      endDateTime.setDate(endDateTime.getDate() + (numPoints / 2) * 7)
    } else if (timeScale === "month") {
      startDateTime.setMonth(startDateTime.getMonth() - numPoints / 2)
      endDateTime.setMonth(endDateTime.getMonth() + numPoints / 2)
    }

    // Filter events within the date range
    const filtered = allEvents.filter((event) => {
      const eventTime = new Date(event.timestamp).getTime()
      return eventTime >= startDateTime.getTime() && eventTime <= endDateTime.getTime()
    })

    // If we have too many events, sample them to match the desired density
    let result = filtered
    if (filtered.length > numPoints) {
      const step = Math.floor(filtered.length / numPoints)
      result = filtered.filter((_, index) => index % step === 0).slice(0, numPoints)
    }

    setFilteredEvents(result)

    // Find and select the closest event to current time
    if (result.length > 0) {
      const closestEvent = findClosestEvent(currentDateTime, result)
      setSelectedEvent(closestEvent)

      // Update slider position based on the selected event
      const eventIndex = result.findIndex((e) => e.id === closestEvent.id)
      if (eventIndex >= 0) {
        setSliderPosition((eventIndex / (result.length - 1)) * 100)
      }
    } else {
      setSelectedEvent(null)
    }
  }, [currentDateTime, timeScale, dataPointDensity, allEvents])

  // Find the closest event to a given datetime
  const findClosestEvent = (targetTime: Date, events: Event[] = filteredEvents): Event => {
    if (events.length === 0) return null!

    return events.reduce((closest, current) => {
      const currentDiff = Math.abs(new Date(current.timestamp).getTime() - targetTime.getTime())
      const closestDiff = Math.abs(new Date(closest.timestamp).getTime() - targetTime.getTime())
      return currentDiff < closestDiff ? current : closest
    })
  }

  // Handle time navigation based on current scale
  const changeTime = (amount: number) => {
    const newDateTime = new Date(currentDateTime)

    if (timeScale === "hour") {
      newDateTime.setHours(currentDateTime.getHours() + amount)
    } else if (timeScale === "day") {
      newDateTime.setDate(currentDateTime.getDate() + amount)
    } else if (timeScale === "week") {
      newDateTime.setDate(currentDateTime.getDate() + amount * 7)
    } else if (timeScale === "month") {
      newDateTime.setMonth(currentDateTime.getMonth() + amount)
    }

    setCurrentDateTime(newDateTime)
  }

  // Handle minute navigation
  const changeMinute = (amount: number) => {
    const newDateTime = new Date(currentDateTime)
    newDateTime.setMinutes(currentDateTime.getMinutes() + amount)
    setCurrentDateTime(newDateTime)
  }

  // Handle hour navigation
  const changeHour = (amount: number) => {
    const newDateTime = new Date(currentDateTime)
    newDateTime.setHours(currentDateTime.getHours() + amount)
    setCurrentDateTime(newDateTime)
  }

  // Handle slider drag
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !sliderRef.current || filteredEvents.length === 0) return

    const sliderRect = sliderRef.current.getBoundingClientRect()
    const sliderWidth = sliderRect.width
    const offsetX = e.clientX - sliderRect.left

    // Calculate new position as percentage
    let newPosition = (offsetX / sliderWidth) * 100
    newPosition = Math.max(0, Math.min(100, newPosition))

    setSliderPosition(newPosition)

    // Find the closest event to the slider position
    const eventIndex = Math.round((newPosition / 100) * (filteredEvents.length - 1))
    if (eventIndex >= 0 && eventIndex < filteredEvents.length) {
      const event = filteredEvents[eventIndex]
      setSelectedEvent(event)
      setCurrentDateTime(new Date(event.timestamp))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Add event listeners for mouse up outside the component
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener("mouseup", handleGlobalMouseUp)
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp)
    }
  }, [])

  // Format datetime for display
  const formatDateTime = (datetime: Date) => {
    const year = datetime.getFullYear()
    const month = datetime.toLocaleString("en-US", { month: "short" }).toUpperCase()
    const day = datetime.getDate()
    const hour = datetime.getHours().toString().padStart(2, "0")
    const minute = datetime.getMinutes().toString().padStart(2, "0")
    return { year, month, day, hour, minute }
  }

  const { year, month, day, hour, minute } = formatDateTime(currentDateTime)

  // Generate tick marks for the timeline based on events
  const generateTicks = () => {
    if (filteredEvents.length === 0) return null

    return filteredEvents.map((event, index) => {
      const position = (index / (filteredEvents.length - 1)) * 100
      const isSelected = selectedEvent?.id === event.id

      return (
        <div
          key={event.id}
          className={cn("absolute top-0 w-px", isSelected ? "bg-teal-300 h-full" : "bg-white/70 h-3")}
          style={{ left: `${position}%` }}
        />
      )
    })
  }

  // Generate time labels for the timeline
  const generateTimeLabels = () => {
    if (filteredEvents.length === 0) return null

    // Determine how many labels to show based on available space
    const numLabels = Math.min(5, filteredEvents.length)
    const step = Math.max(1, Math.floor(filteredEvents.length / (numLabels - 1)))

    const labels = []
    for (let i = 0; i < filteredEvents.length; i += step) {
      if (labels.length >= numLabels) break

      const event = filteredEvents[i]
      const datetime = new Date(event.timestamp)
      let label = ""

      if (timeScale === "hour") {
        label = `${datetime.getHours().toString().padStart(2, "0")}:${datetime.getMinutes().toString().padStart(2, "0")}`
      } else if (timeScale === "day") {
        label = `${datetime.getHours().toString().padStart(2, "0")}:${datetime.getMinutes().toString().padStart(2, "0")}`
      } else if (timeScale === "week" || timeScale === "month") {
        label = `${datetime.toLocaleString("en-US", { month: "short" })} ${datetime.getDate()}`
      }

      labels.push(
        <div
          key={i}
          className="absolute font-medium text-xs"
          style={{
            left: `${(i / (filteredEvents.length - 1)) * 100}%`,
            transform: "translateX(-50%)",
          }}
        >
          {label}
        </div>,
      )
    }

    return labels
  }

  // Handle density change
  const handleDensityChange = (value: string) => {
    if (!value) return
    setDataPointDensity(value as DataPointDensity)
  }

  // Handle time scale change
  const handleTimeScaleChange = (value: string) => {
    setTimeScale(value as TimeScale)
  }

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto">
      {/* Map-like background for visual effect */}
      <div className="relative w-full h-[300px] bg-gradient-to-r from-teal-900 to-blue-900 rounded-lg overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Data visualization based on selected event */}
        <div className="absolute inset-0 flex items-center justify-center">
          {selectedEvent ? (
            <div className="text-white text-center">
              <h2 className="text-2xl font-bold mb-4">
                Data for{" "}
                {new Date(selectedEvent.timestamp).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </h2>
              <div className="grid grid-cols-3 gap-8">
                <div className="bg-white/10 p-4 rounded-lg">
                  <h3 className="text-lg font-medium">Temperature</h3>
                  <p className="text-3xl font-bold mt-2">{selectedEvent.temperature}°C</p>
                </div>
                <div className="bg-white/10 p-4 rounded-lg">
                  <h3 className="text-lg font-medium">Precipitation</h3>
                  <p className="text-3xl font-bold mt-2">{selectedEvent.precipitation}%</p>
                </div>
                <div className="bg-white/10 p-4 rounded-lg">
                  <h3 className="text-lg font-medium">Wind Speed</h3>
                  <p className="text-3xl font-bold mt-2">{selectedEvent.windSpeed} km/h</p>
                </div>
              </div>
              <p className="mt-4 text-sm opacity-80">{selectedEvent.description}</p>
            </div>
          ) : (
            <div className="text-white text-center">
              <h2 className="text-2xl font-bold">No events found for this time period</h2>
              <p className="mt-2">Try adjusting the time scale or data point density</p>
            </div>
          )}
        </div>
      </div>

      {/* Data density and time scale controls */}
      <div className="mt-4 bg-gradient-to-r from-teal-900 to-blue-900 rounded-t-lg p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-sm mr-2">Data Points:</span>
              <ToggleGroup type="single" value={dataPointDensity} onValueChange={handleDensityChange}>
                <ToggleGroupItem value="12" className="px-3 py-1">
                  12
                </ToggleGroupItem>
                <ToggleGroupItem value="24" className="px-3 py-1">
                  24
                </ToggleGroupItem>
                <ToggleGroupItem value="48" className="px-3 py-1">
                  48
                </ToggleGroupItem>
                <ToggleGroupItem value="72" className="px-3 py-1">
                  72
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div>
              <span className="text-sm mr-2">Time Scale:</span>
              <Select value={timeScale} onValueChange={handleTimeScaleChange}>
                <SelectTrigger className="w-[120px] bg-blue-800/50 border-blue-700">
                  <SelectValue placeholder="Scale" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hour">Hourly</SelectItem>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-sm">{filteredEvents.length} events in view</div>
        </div>
      </div>

      {/* Timeline slider component */}
      <div className="bg-gradient-to-r from-teal-900 to-blue-900 rounded-b-lg p-4 text-white">
        <div className="flex items-center">
          {/* Time selector */}
          <div className="flex items-center space-x-4 mr-4">
            <div className="flex flex-col items-center">
              <ChevronUp className="cursor-pointer hover:text-teal-300" onClick={() => changeTime(365)} />
              <div className="text-2xl font-bold">{year}</div>
              <ChevronDown className="cursor-pointer hover:text-teal-300" onClick={() => changeTime(-365)} />
            </div>

            <div className="flex flex-col items-center">
              <ChevronUp className="cursor-pointer hover:text-teal-300" onClick={() => changeTime(1)} />
              <div className="text-2xl font-bold">
                {month} {day}
              </div>
              <ChevronDown className="cursor-pointer hover:text-teal-300" onClick={() => changeTime(-1)} />
            </div>

            <div className="flex flex-col items-center">
              <ChevronUp className="cursor-pointer hover:text-teal-300" onClick={() => changeHour(1)} />
              <div className="text-2xl font-bold">{hour}</div>
              <ChevronDown className="cursor-pointer hover:text-teal-300" onClick={() => changeHour(-1)} />
            </div>

            <div className="flex flex-col items-center">
              <ChevronUp className="cursor-pointer hover:text-teal-300" onClick={() => changeMinute(5)} />
              <div className="text-2xl font-bold">{minute}</div>
              <ChevronDown className="cursor-pointer hover:text-teal-300" onClick={() => changeMinute(-5)} />
            </div>
          </div>

          <div className="flex items-center">
            <ChevronLeft className="text-2xl cursor-pointer hover:text-teal-300 mr-2" onClick={() => changeTime(-1)} />
            <ChevronRight className="text-2xl cursor-pointer hover:text-teal-300" onClick={() => changeTime(1)} />
          </div>

          {/* Timeline slider */}
          <div
            ref={sliderRef}
            className="relative flex-1 h-12 mx-4 cursor-pointer"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <div className="absolute inset-0 flex items-center">
              <div className="relative w-full h-8 bg-blue-900/50 rounded-md overflow-hidden">
                {/* Event tick marks */}
                {generateTicks()}

                {/* Time labels */}
                <div className="absolute bottom-0 left-0 w-full flex justify-between px-2 text-xs">
                  {generateTimeLabels()}
                </div>

                {/* Slider handle */}
                {selectedEvent && (
                  <div
                    className="absolute top-0 h-full w-1 bg-white"
                    style={{
                      left: `${sliderPosition}%`,
                      transition: isDragging ? "none" : "left 0.2s ease-out",
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center ml-2">
            <div className="text-sm font-medium mr-2">
              {timeScale === "hour" ? "MIN" : timeScale === "day" ? "HOUR" : "DAY"}
            </div>
            <div className="flex flex-col">
              <ChevronUp
                className="h-4 w-4 cursor-pointer hover:text-teal-300"
                onClick={() => (timeScale === "hour" ? changeMinute(5) : changeTime(1))}
              />
              <ChevronDown
                className="h-4 w-4 cursor-pointer hover:text-teal-300"
                onClick={() => (timeScale === "hour" ? changeMinute(-5) : changeTime(-1))}
              />
            </div>
            <Eye className="ml-4 cursor-pointer hover:text-teal-300" />
          </div>
        </div>
      </div>
    </div>
  )
}



[
  {
    "id": "event-1",
    "timestamp": "2025-03-11T08:30:00.000Z",
    "temperature": 18,
    "precipitation": 0,
    "windSpeed": 12,
    "description": "Clear morning"
  },
  {
    "id": "event-2",
    "timestamp": "2025-03-11T10:15:00.000Z",
    "temperature": 20,
    "precipitation": 0,
    "windSpeed": 15,
    "description": "Sunny with light breeze"
  },
  {
    "id": "event-3",
    "timestamp": "2025-03-11T12:45:00.000Z",
    "temperature": 24,
    "precipitation": 0,
    "windSpeed": 10,
    "description": "Peak temperature for the day"
  },
  {
    "id": "event-4",
    "timestamp": "2025-03-11T14:30:00.000Z",
    "temperature": 23,
    "precipitation": 10,
    "windSpeed": 18,
    "description": "Clouds forming"
  },
  {
    "id": "event-5",
    "timestamp": "2025-03-11T16:20:00.000Z",
    "temperature": 21,
    "precipitation": 30,
    "windSpeed": 25,
    "description": "Light rain starting"
  },
  {
    "id": "event-6",
    "timestamp": "2025-03-11T18:00:00.000Z",
    "temperature": 19,
    "precipitation": 60,
    "windSpeed": 30,
    "description": "Moderate rainfall"
  },
  {
    "id": "event-7",
    "timestamp": "2025-03-11T20:15:00.000Z",
    "temperature": 17,
    "precipitation": 40,
    "windSpeed": 22,
    "description": "Rain tapering off"
  },
  {
    "id": "event-8",
    "timestamp": "2025-03-11T22:30:00.000Z",
    "temperature": 15,
    "precipitation": 10,
    "windSpeed": 8,
    "description": "Clearing up for the night"
  }
]

