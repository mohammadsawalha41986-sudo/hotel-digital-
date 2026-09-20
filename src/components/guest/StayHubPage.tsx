import { RoomType, Language, Hotel } from '../../types/hotel';
import { InRoomServicesHubPage } from './InRoomServicesHubPage';

interface StayHubPageProps {
  rooms?: RoomType[];
  currency?: string;
  language: Language;
  hotelWhatsApp?: string;
  hotelNameEn?: string;
  hotelNameAr?: string;
  roomNumber?: string;
  onSetRoomNumber?: (room: string) => void;
  hotel: Hotel;
}

export const StayHubPage: React.FC<StayHubPageProps> = ({
  language,
  roomNumber = '',
  onSetRoomNumber = () => {},
  hotel,
}) => {
  return (
    <InRoomServicesHubPage
      hotel={hotel}
      language={language}
      roomNumber={roomNumber}
      onSetRoomNumber={onSetRoomNumber}
    />
  );
};
