import CalendarIcon from '@heroicons/react/outline/CalendarIcon';

import CogIcon from '@heroicons/react/outline/CogIcon';
import ClipboardIcon from '@heroicons/react/outline/ClipboardIcon';
import LibraryIcon from '@heroicons/react/outline/LibraryIcon';

const userNavigationItems = [
  {
    title: 'Mes Agendas',
    id: 'user-calendar',
    url: '/mes/agendas',
    icon: <CalendarIcon className="w-5 h-5 mr-2" />,
  },
  {
    title: 'Mes Cinémas (coming soon)',
    id: 'my-venues',
    url: '/mes-salles',
    disabled: true,
    icon: <LibraryIcon className="w-5 h-5 mr-2" />,
  },
  {
    title: 'Watch List (coming soon)',
    id: 'my-watch-list',
    url: '/watch-list',
    disabled: true,
    icon: <ClipboardIcon className="w-5 h-5 mr-2" />,
  },
  {
    title: 'Paramètres (coming soon)',
    id: 'my-settings',
    url: '/settings',
    disabled: true,
    icon: <CogIcon className="w-5 h-5 mr-2" />,
  },
];

export default userNavigationItems;
