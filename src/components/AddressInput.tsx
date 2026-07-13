import { Autocomplete } from "@react-google-maps/api";
import { useRef } from "react";

export default function AddressInput() {
  const autoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onPlaceChanged = () => {
    const place = autoRef.current?.getPlace();
    console.log(place?.formatted_address);
    console.log(place?.address_components);
  };

  return (
    <Autocomplete
      onLoad={(ref) => (autoRef.current = ref)}
      onPlaceChanged={onPlaceChanged}
    >
      <input
        type="text"
        placeholder="Enter address"
        className="w-full border p-2"
      />
    </Autocomplete>
  );
}