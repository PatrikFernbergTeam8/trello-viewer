import React, { useEffect, useState, useCallback } from "react";
import { Package, Clock, CheckCircle, AlertCircle, Truck, Calendar } from "lucide-react";

// Konfigurera dina API-uppgifter här
const API_CONFIG = {
  key: import.meta.env.VITE_API_KEY,
  token: import.meta.env.VITE_API_TOKEN,
  boardId: import.meta.env.VITE_BOARD_ID
};

// Statusikoner och färger för olika listor
const getListStatus = (listName) => {
  const name = listName.toLowerCase();
  if (name.includes('ny') || name.includes('inkommande')) {
    return { icon: Clock, color: 'bg-gray-600', bgColor: 'bg-gray-50', textColor: 'text-gray-700' };
  }
  if (name.includes('process') || name.includes('bearbetning')) {
    return { icon: Package, color: 'bg-pink-500', bgColor: 'bg-pink-50', textColor: 'text-pink-700' };
  }
  if (name.includes('skicka') || name.includes('leverans')) {
    return { icon: Truck, color: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-700' };
  }
  if (name.includes('klar') || name.includes('färdig')) {
    return { icon: CheckCircle, color: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-700' };
  }
  return { icon: AlertCircle, color: 'bg-gray-500', bgColor: 'bg-gray-50', textColor: 'text-gray-700' };
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('sv-SE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const OrderCard = ({ card }) => {
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 hover:shadow-lg transition-all duration-300 group hover:border-gray-300/50 hover:bg-white hover:shadow-xl" style={{'--hover-shadow': 'rgba(242,65,98,0.1)'}}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 group-hover:transition-colors leading-tight flex-1 mr-4" style={{color: '#25323A'}}>
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline group-hover:opacity-80"
            style={{'--hover-color': '#F24162'}}
          >
            {card.name}
          </a>
        </h3>
        
        <div className="flex items-center px-3 py-1.5 rounded-full flex-shrink-0" style={{backgroundColor: 'rgba(37,50,58,0.1)'}}>
          <Calendar className="h-4 w-4 mr-2" style={{color: '#25323A'}} />
          <span className="font-medium text-sm" style={{color: '#25323A'}}>{formatDate(card.dateLastActivity)}</span>
        </div>
      </div>
    </div>
  );
};

const OrderList = ({ list, cards, isLoading }) => {
  const status = getListStatus(list.name);
  const StatusIcon = status.icon;
  
  return (
    <div className="mb-8 bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:bg-white/95">
      <div className="px-6 py-5 border-b border-gray-100" style={{background: 'linear-gradient(135deg, rgba(37,50,58,0.05) 0%, rgba(242,65,98,0.05) 100%)'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`p-3 rounded-xl mr-4 shadow-lg ${status.color}`}>
              <StatusIcon className="h-6 w-6 text-white" />
            </div>
            <h2 className="font-bold text-xl" style={{color: '#25323A'}}>{list.name}</h2>
          </div>
          <span className="text-sm font-bold px-4 py-2 rounded-full text-white shadow-md" style={{background: 'linear-gradient(135deg, #F24162 0%, #e63558 100%)'}}>
            {cards.length} ordrar
          </span>
        </div>
      </div>
      
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent border-r-2" style={{borderTopColor: '#F24162', borderRightColor: '#25323A'}}></div>
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto mb-4" style={{color: '#25323A', opacity: 0.3}} />
            <p className="font-medium text-lg" style={{color: '#25323A', opacity: 0.6}}>Inga ordrar i denna kategori</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cards.map((card) => (
              <OrderCard key={card.id} card={card} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function TrelloOrderDashboard() {
  const [lists, setLists] = useState([]);
  const [cardsByList, setCardsByList] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingCards, setLoadingCards] = useState({});

  const fetchWithErrorHandling = useCallback(async (url, errorMessage) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      throw new Error(`${errorMessage}: ${err.message}`);
    }
  }, []);

  const fetchCards = useCallback(async (list) => {
    setLoadingCards(prev => ({ ...prev, [list.id]: true }));
    
    try {
      const cards = await fetchWithErrorHandling(
        `https://api.trello.com/1/lists/${list.id}/cards?key=${API_CONFIG.key}&token=${API_CONFIG.token}&members=true`,
        'Kunde inte hämta kort'
      );
      
      setCardsByList(prev => ({
        ...prev,
        [list.id]: cards,
      }));
    } catch (err) {
      console.error(`Fel vid hämtning av kort för lista ${list.name}:`, err);
      setCardsByList(prev => ({
        ...prev,
        [list.id]: [],
      }));
    } finally {
      setLoadingCards(prev => ({ ...prev, [list.id]: false }));
    }
  }, [fetchWithErrorHandling]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const listsData = await fetchWithErrorHandling(
        `https://api.trello.com/1/boards/${API_CONFIG.boardId}/lists?key=${API_CONFIG.key}&token=${API_CONFIG.token}`,
        'Kunde inte hämta listor'
      );
      
      setLists(listsData);
      
      // Hämta kort för alla listor parallellt
      await Promise.all(listsData.map(fetchCards));
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchWithErrorHandling, fetchCards]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalOrders = Object.values(cardsByList).reduce((sum, cards) => sum + cards.length, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(135deg, #25323A 0%, #1a252b 50%, #25323A 100%)'}}>
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 rounded-full animate-spin" style={{borderColor: 'rgba(242,65,98,0.3)', borderTopColor: '#F24162'}}></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent rounded-full animate-spin" style={{borderTopColor: '#25323A'}}></div>
          </div>
          <p className="text-white/80 mt-4 text-lg">Laddar dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(135deg, #25323A 0%, #1a252b 50%, #25323A 100%)'}}>
        <div className="backdrop-blur-sm border rounded-2xl p-8 max-w-md" style={{backgroundColor: 'rgba(242,65,98,0.2)', borderColor: 'rgba(242,65,98,0.5)'}}>
          <div className="flex items-center mb-4">
            <AlertCircle className="h-8 w-8 mr-3" style={{color: '#F24162'}} />
            <h2 className="text-xl font-bold text-white">Fel uppstod</h2>
          </div>
          <p className="mb-6" style={{color: 'rgba(242,65,98,0.8)'}}>{error}</p>
          <button
            onClick={fetchData}
            className="w-full px-6 py-3 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
            style={{background: 'linear-gradient(135deg, #F24162 0%, #e63558 100%)'}}
          >
            Försök igen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-gray-900 relative overflow-hidden" style={{background: 'linear-gradient(135deg, #25323A 0%, #1a252b 50%, #25323A 100%)'}}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{background: 'linear-gradient(45deg, rgba(242,65,98,0.1) 0%, transparent 50%, rgba(242,65,98,0.1) 100%)'}}></div>
      </div>
      
      <div className="relative z-10 p-8">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-2xl shadow-lg mr-4" style={{background: 'linear-gradient(135deg, #F24162 0%, #e63558 100%)'}}>
              <Package className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">
                Orderstatus Dashboard
              </h1>
              <p className="text-gray-300 text-lg mt-1">
                Realtidsöversikt över alla ordrar • <span className="font-semibold text-white">{totalOrders}</span> aktiva ordrar
              </p>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto">
          {lists.map((list) => (
            <OrderList
              key={list.id}
              list={list}
              cards={cardsByList[list.id] || []}
              isLoading={loadingCards[list.id]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}