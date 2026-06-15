'use client'

import ButtonSecondary from '@/components/button-secondary'
import { Divider } from '@/components/divider'
import { Heading } from '@/components/heading'
import Input from '@/components/input'
import Select from '@/components/select'
import { Map, MapMarker, MarkerContent, MarkerPopup } from '@/components/ui/map'
import { MapPinIcon } from '@heroicons/react/24/solid'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import FormItem from '../form-item'

const Page = () => {
  const [draggableMarker, setDraggableMarker] = useState({
    lng: -73.98,
    lat: 40.75,
  })
  const router = useRouter()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/3')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    // Handle form submission logic here
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/3')
  }

  return (
    <>
      <Heading>Your place location</Heading>
      <Divider />

      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        <div>
          <ButtonSecondary>
            <MapPinIcon className="size-5" />
            <span>Use current location</span>
          </ButtonSecondary>
        </div>
        {/* ITEM */}
        <FormItem label="Country/Region">
          <Select name="country-region">
            <option value="United States">United States</option>
            <option value="Viet Nam">Viet Nam</option>
            <option value="Thailand">Thailand</option>
            <option value="France">France</option>
            <option value="Singapore">Singapore</option>
            <option value="Jappan">Jappan</option>
            <option value="Korea">Korea</option>
            <option value="...">...</option>
          </Select>
        </FormItem>
        <FormItem label="Street">
          <Input name="Street" placeholder="..." />
        </FormItem>
        <FormItem label="Room number (optional)">
          <Input name="room-number" type="number" />
        </FormItem>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-5">
          <FormItem label="City">
            <Input name="city" />
          </FormItem>
          <FormItem label="State">
            <Input name="state" />
          </FormItem>
          <FormItem label="Postal code">
            <Input name="Postal" />
          </FormItem>
        </div>
        <div>
          <p>Detailed address</p>
          <span className="mt-1 block text-sm text-muted-foreground">
            1110 Pennsylvania Avenue NW, Washington, DC 20230
          </span>
          <div className="mt-4">
            <div className="aspect-w-5 aspect-h-7 sm:aspect-h-3">
              <div className="overflow-hidden rounded-xl">
                <Map center={[-73.98, 40.75]} zoom={12}>
                  <MapMarker
                    draggable
                    longitude={draggableMarker.lng}
                    latitude={draggableMarker.lat}
                    onDragEnd={(lngLat) => {
                      setDraggableMarker({ lng: lngLat.lng, lat: lngLat.lat })
                    }}
                  >
                    <MarkerContent>
                      <div className="cursor-move">
                        <MapPinIcon className="size-8" />
                      </div>
                    </MarkerContent>
                    <MarkerPopup>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">Coordinates</p>
                        <p className="text-xs text-muted-foreground">
                          {draggableMarker.lat.toFixed(4)}, {draggableMarker.lng.toFixed(4)}
                        </p>
                      </div>
                    </MarkerPopup>
                  </MapMarker>
                </Map>

                <input type="hidden" name="latMapPosition" value={draggableMarker.lat} />
                <input type="hidden" name="lngMapPosition" value={draggableMarker.lng} />
              </div>
            </div>
          </div>
        </div>
      </Form>
    </>
  )
}

export default Page
