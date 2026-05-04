import { useNavigate } from 'react-router-dom';
import SentientCard from './SentientCard';

export default function AnimeCard({ anime }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/info/${anime.imdb_id}`, { state: { movie: anime } });
  };

  return (
    <div onClick={handleClick} className="cursor-pointer">
      <SentientCard item={anime} onClick={() => {}} />
    </div>
  );
}
