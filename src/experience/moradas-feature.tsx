import {createRoot} from 'react-dom/client';
import FeaturedDevelopment from './FeaturedDevelopment';

export function mountFeaturedDevelopment(host:HTMLElement){
  const root=createRoot(host);
  root.render(<FeaturedDevelopment/>);
  return ()=>root.unmount();
}
