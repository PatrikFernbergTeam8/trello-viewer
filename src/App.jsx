import React, { useEffect, useState, useCallback } from "react";
import { Package, Clock, CheckCircle, AlertCircle, Truck, Calendar, Printer, Phone, Monitor, Cloud } from "lucide-react";

const API_CONFIG = {
  key: import.meta.env.VITE_API_KEY,
  token: import.meta.env.VITE_API_TOKEN
};

const BOARD_IDS = {
  skrivare: import.meta.env.VITE_SKRIVARE_BOARD_ID,
  telefoni: import.meta.env.VITE_TELEFONI_BOARD_ID,
  av: import.meta.env.VITE_AV_BOARD_ID,
  m365: import.meta.env.VITE_M365_BOARD_ID
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
    year: 'numeric'
  });
};

const getCardCreatedDate = (card) => {
  if (card.id && card.id.length >= 8) {
    const timestamp = parseInt(card.id.substring(0, 8), 16) * 1000;
    return new Date(timestamp);
  }
  return new Date(card.dateLastActivity);
};

const getDisplayDate = (card) => {
  const datePattern = /(\d{4}-\d{2}-\d{2})/;
  const match = card.name.match(datePattern);
  
  if (match) {
    const extractedDate = new Date(match[1]);
    if (!isNaN(extractedDate.getTime())) {
      return extractedDate;
    }
  }
  
  return getCardCreatedDate(card);
};

const getResponsibleSeller = (card) => {
  if (!card.desc) return '';
  
  const lines = card.desc.split('\n');
  const sellerLine = lines.find(line => 
    line.toLowerCase().includes('ansvarig säljare:') || 
    line.toLowerCase().includes('**ansvarig säljare:**')
  );
  
  if (sellerLine) {
    const match = sellerLine.match(/\*?\*?ansvarig säljare:\*?\*?\s*(.+)/i);
    return match ? match[1].trim() : '';
  }
  
  return '';
};

const Sidebar = ({ activeMenu, setActiveMenu, isCollapsed, setIsCollapsed }) => {
  const menuItems = [
    { id: 'oversikt', name: 'Översikt', icon: Package },
    { id: 'skrivare', name: 'Skrivarleveranser', icon: Printer },
    { id: 'telefoni', name: 'Telefonileveranser', icon: Phone },
    { id: 'av', name: 'AV-leveranser', icon: Monitor },
    { id: 'm365', name: 'M365-leveranser', icon: Cloud },
    { id: 'lager', name: 'Lager', icon: Archive }
  ];

  return (
    <div 
      className={`${isCollapsed ? 'w-16' : 'w-64'} min-h-screen border-r border-white/20 backdrop-blur-sm transition-all duration-300 ease-in-out`}
      style={{background: 'linear-gradient(180deg, rgba(37,50,58,0.95) 0%, rgba(37,50,58,0.9) 100%)'}}
    >
      <div className="p-4">
        {/* Header med toggle-knapp */}
        <div className="flex items-center justify-between mb-6">
          {!isCollapsed && (
            <div className="flex items-center">
              <div 
                className="p-2 rounded-xl mr-3" 
                style={{background: 'linear-gradient(135deg, #F24162 0%, #e63558 100%)'}}
              >
                <Package className="h-6 w-6 text-white" />
              </div>
              <h2 className="font-bold text-lg text-white">Leveranser</h2>
            </div>
          )}
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors duration-200 text-sm font-bold"
            title={isCollapsed ? 'Expandera meny' : 'Minimera meny'}
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>
        
        {/* Navigationsmeny */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeMenu === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-3' : 'px-4'} py-3 rounded-xl text-left transition-all duration-200 ${
                  isActive 
                    ? 'text-white shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
                style={isActive ? {background: 'linear-gradient(135deg, #F24162 0%, #e63558 100%)'} : {}}
                title={isCollapsed ? item.name : undefined}
              >
                <IconComponent className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} flex-shrink-0`} />
                {!isCollapsed && (
                  <span className="font-medium whitespace-nowrap">{item.name}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

const OrderCard = ({ card, listName }) => {
  const getDateLabel = (listName) => {
    if (listName.toLowerCase().includes('uppstartsmöte') && listName.toLowerCase().includes('bokat')) {
      return 'Uppstartsmöte bokat till:';
    }
    return 'Inskickad:';
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 hover:shadow-lg transition-all duration-300 group hover:border-gray-300/50 hover:bg-white hover:shadow-xl">
      <div className="flex items-start flex-wrap gap-2 md:gap-4">
        <h3 className="font-semibold flex-1 min-w-0 mr-2 text-gray-900" style={{color: '#25323A', minWidth: '180px', maxWidth: '250px'}}>
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline group-hover:opacity-80 block text-gray-900"
            style={{color: '#25323A', wordBreak: 'break-word'}}
            title={card.name}
          >
            {card.name}
          </a>
        </h3>
        
        <div className="flex flex-wrap gap-1" style={{minWidth: '120px', flex: '1'}}>
          {card.labels && card.labels.map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap"
              style={{
                backgroundColor: 
                  label.color === 'green' ? '#10B981' :
                  label.color === 'yellow' ? '#F59E0B' :
                  label.color === 'orange' ? '#F97316' :
                  label.color === 'red' ? '#EF4444' :
                  label.color === 'purple' ? '#8B5CF6' :
                  label.color === 'blue' ? '#3B82F6' :
                  label.color === 'sky' ? '#0EA5E9' :
                  label.color === 'lime' ? '#84CC16' :
                  label.color === 'pink' ? '#EC4899' :
                  label.color === 'black' ? '#1F2937' :
                  '#6B7280'
              }}
            >
              {label.name || 'Ingen text'}
            </span>
          ))}
        </div>
        
        <div className="text-center flex-shrink-0" style={{minWidth: '100px'}}>
          {getResponsibleSeller(card) && (
            <span className="text-xs font-medium px-2 py-1 rounded-md" style={{color: '#25323A', backgroundColor: 'rgba(37,50,58,0.1)'}}>
              {getResponsibleSeller(card)}
            </span>
          )}
        </div>
        
        <div className="flex items-center px-3 py-1.5 rounded-full flex-shrink-0" style={{backgroundColor: 'rgba(37,50,58,0.1)', minWidth: '150px'}}>
          <Calendar className="h-3 w-3 mr-2" style={{color: '#25323A'}} />
          <span className="font-medium text-xs whitespace-nowrap" style={{color: '#25323A'}}>
            {getDateLabel(listName)} {formatDate(getDisplayDate(card))}
          </span>
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center">
            <div className={`p-3 rounded-xl mr-4 shadow-lg ${status.color}`}>
              <StatusIcon className="h-6 w-6 text-white" />
            </div>
            <h2 className="font-bold text-xl" style={{color: '#25323A'}}>{list.name}</h2>
          </div>
          <span className="text-sm font-bold px-4 py-2 rounded-full text-white shadow-md flex-shrink-0" style={{background: 'linear-gradient(135deg, #F24162 0%, #e63558 100%)'}}>
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
          <div className="space-y-4">
            {cards
              .sort((a, b) => {
                const dateA = getDisplayDate(a);
                const dateB = getDisplayDate(b);
                
                if (list.name.toLowerCase().includes('ny') && list.name.toLowerCase().includes('leverans')) {
                  return dateB - dateA;
                }
                
                return dateA - dateB;
              })
              .map((card) => (
                <OrderCard key={card.id} card={card} listName={list.name} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

const OverviewCard = ({ title, boardId, icon: Icon }) => {
  const [totalCards, setTotalCards] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBoardStats = async () => {
      try {
        setLoading(true);
        const listsData = await fetch(
          `https://api.trello.com/1/boards/${boardId}/lists?key=${API_CONFIG.key}&token=${API_CONFIG.token}`
        ).then(res => res.json());

        let total = 0;
        for (const list of listsData) {
          const cards = await fetch(
            `https://api.trello.com/1/lists/${list.id}/cards?key=${API_CONFIG.key}&token=${API_CONFIG.token}`
          ).then(res => res.json());
          
          total += cards.length;
        }

        setTotalCards(total);
      } catch (error) {
        console.error(`Fel vid hämtning av stats för ${title}:`, error);
        setTotalCards(0);
      } finally {
        setLoading(false);
      }
    };

    fetchBoardStats();
  }, [boardId, title]);

  return (
    <div className="bg-white/90 backdrop-blur-lg rounded-xl lg:rounded-2xl shadow-xl border border-white/30 p-4 lg:p-6 hover:shadow-2xl transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 lg:mb-4">
        <div className="flex items-center mb-2 sm:mb-0">
          <div className="p-2 lg:p-3 rounded-lg lg:rounded-xl mr-3 lg:mr-4 shadow-lg" style={{background: 'linear-gradient(135deg, #F24162 0%, #e63558 100%)'}}>
            <Icon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
          </div>
          <h3 className="font-bold text-sm sm:text-base lg:text-lg" style={{color: '#25323A'}}>{title}</h3>
        </div>
      </div>
      
      <div className="text-center">
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 lg:h-8 lg:w-8 border-2 border-transparent" style={{borderTopColor: '#F24162'}}></div>
          </div>
        ) : (
          <div>
            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold" style={{color: '#F24162'}}>{totalCards}</span>
            <p className="text-xs sm:text-sm font-medium mt-1" style={{color: '#25323A'}}>aktiva leveranser</p>
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
  const [activeMenu, setActiveMenu] = useState('oversikt');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Automatisk kollaps på små skärmar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCurrentBoardId = () => {
    return BOARD_IDS[activeMenu] || BOARD_IDS.skrivare;
  };

  const getCurrentTitle = () => {
    switch(activeMenu) {
      case 'oversikt': return 'Översikt Dashboard';
      case 'skrivare': return 'Skrivarleveranser Dashboard';
      case 'telefoni': return 'Telefonileveranser Dashboard';
      case 'av': return 'AV-leveranser Dashboard';
      case 'm365': return 'M365-leveranser Dashboard';
      case 'lager': return 'Lager Dashboard';
      default: return 'Orderstatus Dashboard';
    }
  };

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
        `https://api.trello.com/1/lists/${list.id}/cards?key=${API_CONFIG.key}&token=${API_CONFIG.token}&members=true&labels=true&fields=name,url,dateLastActivity,desc,id,labels`,
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
    if (activeMenu === 'oversikt' || activeMenu === 'lager') {
      // För översikt och lager, visa bara en enkel sida
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setCardsByList({});
    
    const boardId = getCurrentBoardId();
    
    try {
      const listsData = await fetchWithErrorHandling(
        `https://api.trello.com/1/boards/${boardId}/lists?key=${API_CONFIG.key}&token=${API_CONFIG.token}`,
        'Kunde inte hämta listor'
      );
      
      setLists(listsData);
      await Promise.all(listsData.map(fetchCards));
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeMenu, fetchWithErrorHandling, fetchCards]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalOrders = Object.values(cardsByList).reduce((sum, cards) => sum + cards.length, 0);

  if (loading && activeMenu !== 'oversikt' && activeMenu !== 'lager') {
    return (
      <div className="min-h-screen flex" style={{background: 'linear-gradient(135deg, #25323A 0%, #1a252b 50%, #25323A 100%)'}}>
        <Sidebar 
          activeMenu={activeMenu} 
          setActiveMenu={setActiveMenu} 
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 rounded-full animate-spin" style={{borderColor: 'rgba(242,65,98,0.3)', borderTopColor: '#F24162'}}></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent rounded-full animate-spin" style={{borderTopColor: '#25323A'}}></div>
            </div>
            <p className="text-white/80 mt-4 text-lg">Laddar dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex" style={{background: 'linear-gradient(135deg, #25323A 0%, #1a252b 50%, #25323A 100%)'}}>
        <Sidebar 
          activeMenu={activeMenu} 
          setActiveMenu={setActiveMenu} 
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="backdrop-blur-sm border rounded-2xl p-8 max-w-md mx-4" style={{backgroundColor: 'rgba(242,65,98,0.2)', borderColor: 'rgba(242,65,98,0.5)'}}>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{background: 'linear-gradient(135deg, #25323A 0%, #1a252b 50%, #25323A 100%)'}}>
      <Sidebar 
        activeMenu={activeMenu} 
        setActiveMenu={setActiveMenu} 
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      
      {activeMenu === 'oversikt' ? (
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{background: 'linear-gradient(45deg, rgba(242,65,98,0.1) 0%, transparent 50%, rgba(242,65,98,0.1) 100%)'}}></div>
          </div>
          
          <div className="relative z-10 p-4 sm:p-6 lg:p-8">
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center mb-4">
                <div className="p-2 lg:p-3 rounded-2xl shadow-lg mr-3 lg:mr-4" style={{background: 'linear-gradient(135deg, #F24162 0%, #e63558 100%)'}}>
                  <Package className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                    Översikt Dashboard
                  </h1>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-300 mt-1">
                    Realtidsöversikt över alla leveransområden
                  </p>
                </div>
              </div>
            </div>
            
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
                <OverviewCard 
                  title="Skrivarleveranser" 
                  boardId={BOARD_IDS.skrivare} 
                  icon={Printer}
                />
                <OverviewCard 
                  title="Telefonileveranser" 
                  boardId={BOARD_IDS.telefoni} 
                  icon={Phone}
                />
                <OverviewCard 
                  title="AV-leveranser" 
                  boardId={BOARD_IDS.av} 
                  icon={Monitor}
                />
                <OverviewCard 
                  title="M365-leveranser" 
                  boardId={BOARD_IDS.m365} 
                  icon={Cloud}
                />
              </div>
              
              {/* Plats för framtida innehåll */}
              <div className="space-y-6">
                {/* Här kan ni lägga till fler sektioner senare */}
              </div>
            </div>
          </div>
        </div>
      ) : activeMenu === 'lager' ? (
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{background: 'linear-gradient(45deg, rgba(242,65,98,0.1) 0%, transparent 50%, rgba(242,65,98,0.1) 100%)'}}></div>
          </div>
          
          <div className="relative z-10 p-4 sm:p-6 lg:p-8">
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center mb-4">
                <div className="p-2 lg:p-3 rounded-2xl shadow-lg mr-3 lg:mr-4" style={{background: 'linear-gradient(135deg, #F24162 0%, #e63558 100%)'}}>
                  <Archive className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                    Lager Dashboard
                  </h1>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-300 mt-1">
                    Lagerhantering och inventering
                  </p>
                </div>
              </div>
            </div>
            
            <div className="max-w-7xl mx-auto">
              <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 p-8 text-center">
                <Archive className="h-16 w-16 mx-auto mb-4" style={{color: '#25323A', opacity: 0.3}} />
                <h2 className="text-2xl font-bold mb-2" style={{color: '#25323A'}}>Lager Dashboard</h2>
                <p className="text-lg" style={{color: '#25323A', opacity: 0.6}}>Kommer snart</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{background: 'linear-gradient(45deg, rgba(242,65,98,0.1) 0%, transparent 50%, rgba(242,65,98,0.1) 100%)'}}></div>
          </div>
          
          <div className="relative z-10 p-4 sm:p-6 lg:p-8">
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center mb-4">
                <div className="p-2 lg:p-3 rounded-2xl shadow-lg mr-3 lg:mr-4" style={{background: 'linear-gradient(135deg, #F24162 0%, #e63558 100%)'}}>
                  <Package className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                    {getCurrentTitle()}
                  </h1>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-300 mt-1">
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
      )}
    </div>
  );
}