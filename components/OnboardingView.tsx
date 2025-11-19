import React from 'react';
import OjoDeLocaLogo from './OjoDeLocaLogo';

interface OnboardingViewProps {
  onComplete: () => void;
}

const FeatureStep = ({ icon, title, description }: { icon: string, title: string, description: string }) => (
    <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-3xl">{icon}</span>
        </div>
        <div>
            <h3 className="font-bold text-text-primary dark:text-gray-200 text-lg">{title}</h3>
            <p className="text-text-secondary dark:text-gray-400">{description}</p>
        </div>
    </div>
);


const OnboardingView = ({ onComplete }: OnboardingViewProps) => {
  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl rounded-3xl p-8 text-center flex flex-col items-center">
        <div className="w-20 h-20 mb-4">
            <OjoDeLocaLogo className="w-full h-full text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary dark:text-gray-100 mb-2">¡Bienvenida a Ojo de Loca!</h1>
        <p className="text-text-secondary dark:text-gray-400 mb-8">Tu estilista personal con IA. Empecemos.</p>
        
        <div className="space-y-6 text-left w-full mb-8">
            <FeatureStep icon="add_a_photo" title="1. Añade tus prendas" description="Digitaliza tu armario subiendo fotos o creando ropa con IA." />
            <FeatureStep icon="auto_awesome" title="2. Genera Outfits" description="Pide un look para cualquier ocasión y deja que la IA haga la magia." />
            <FeatureStep icon="checkroom" title="3. Pruébatelos" description="Usa el Probador Virtual para ver cómo te quedan los outfits." />
        </div>

        <button 
          onClick={onComplete}
          className="w-full bg-primary text-white font-bold py-3 px-4 rounded-xl transition-transform active:scale-95"
        >
          ¡Vamos!
        </button>
      </div>
    </div>
  );
};

export default OnboardingView;