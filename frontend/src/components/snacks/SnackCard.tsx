import React, { useState } from 'react';
import { SnackItem } from '../../types/snack';
import { getCategoryEmoji, getSnackImageUrl } from '../../utils/snackImages';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SnackCardProps {
  snack: SnackItem;
  onVoteToggle: (snackId: string) => Promise<void>;
  onConsume: (snackId: string) => Promise<void>;
}

export const SnackCard: React.FC<SnackCardProps> = ({
  snack,
  onVoteToggle,
  onConsume,
}) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isVoting, setIsVoting] = useState(false);
  const [isConsuming, setIsConsuming] = useState(false);

  const imageUrl = getSnackImageUrl(snack.name, snack.category);
  const emoji = getCategoryEmoji(snack.category);

  const getStatusBadge = () => {
    switch (snack.status) {
      case 'STOCKED':
        return <Badge variant="success">STOCKED</Badge>;
      case 'RUNNING_LOW':
        return <Badge variant="warning">RUNNING LOW</Badge>;
      case 'GONE':
        return <Badge variant="danger">OUT OF STOCK</Badge>;
      default:
        return null;
    }
  };

  const handleVoteClick = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setIsVoting(true);
    try {
      await onVoteToggle(snack.id);
    } finally {
      setIsVoting(false);
    }
  };

  const handleConsumeClick = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (snack.quantity <= 0) return;
    setIsConsuming(true);
    try {
      await onConsume(snack.id);
    } finally {
      setIsConsuming(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group">
      {/* Product Image Header */}
      <div className="relative h-44 w-full bg-gray-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={snack.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

        {/* Top Floating Badges */}
        <div className="absolute top-3 left-3 flex items-center space-x-1.5">
          <span className="bg-white/95 backdrop-blur-xs text-xs font-semibold px-2.5 py-1 rounded-full shadow-2xs text-gray-800 flex items-center space-x-1">
            <span>{emoji}</span>
            <span className="text-[11px] tracking-wide">{snack.category.replace('_', ' ')}</span>
          </span>
        </div>

        <div className="absolute top-3 right-3">{getStatusBadge()}</div>

        {/* Bottom Image Overlay: Remaining count */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs font-medium">
          <span className="drop-shadow-sm font-semibold">
            {snack.quantity} in pantry
          </span>
          {snack.quantity <= snack.lowStockThreshold && snack.quantity > 0 && (
            <span className="text-amber-300 drop-shadow-sm text-[11px] font-bold">
              Only {snack.quantity} left!
            </span>
          )}
        </div>
      </div>

      {/* Body Info */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-1" title={snack.name}>
            {snack.name}
          </h3>

          {/* Quantity Progress Indicator */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Availability</span>
              <span className="font-medium text-gray-700">
                {snack.quantity > 0 ? `${snack.quantity} left` : 'Depleted'}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  snack.status === 'STOCKED'
                    ? 'bg-emerald-500'
                    : snack.status === 'RUNNING_LOW'
                    ? 'bg-amber-500'
                    : 'bg-rose-400'
                }`}
                style={{
                  width: `${Math.min(100, (snack.quantity / Math.max(15, snack.lowStockThreshold * 2)) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Card Actions */}
        <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
          {/* Vote Button */}
          <button
            type="button"
            onClick={handleVoteClick}
            disabled={isVoting}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              snack.hasVoted
                ? 'bg-orange-50 border-orange-300 text-orange-600 shadow-2xs'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            title={snack.hasVoted ? 'Click to remove vote' : 'Vote for this snack'}
          >
            <span className="text-sm">{snack.hasVoted ? '❤️' : '🤍'}</span>
            <span>{snack.voteCount}</span>
          </button>

          {/* Consume Button */}
          <Button
            size="sm"
            variant={snack.quantity > 0 ? 'primary' : 'outline'}
            disabled={snack.quantity <= 0 || isConsuming}
            isLoading={isConsuming}
            onClick={handleConsumeClick}
            className={`text-xs px-3.5 py-1.5 ${snack.quantity <= 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {snack.quantity > 0 ? 'Grab Snack' : 'Out of Stock'}
          </Button>
        </div>
      </div>
    </div>
  );
};

