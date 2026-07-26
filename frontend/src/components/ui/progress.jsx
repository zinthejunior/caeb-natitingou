import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";
function Progress({
  className,
  value = 0,
  ...props
}) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  return <ProgressPrimitive.Root
    data-slot="progress"
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={clamped}
    className={cn(
      // piste : légèrement plus sombre en mode clair pour le contraste, teinte discrète en mode sombre
      "relative h-2 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-library-accent/12",
      className
    )}
    {...props}
  >
      <ProgressPrimitive.Indicator
    data-slot="progress-indicator"
    className={cn(
      // indicateur : utiliser l'accent du thème (bleu en clair / jaune en sombre) et ajouter une ombre interne discrète
      "h-full transition-all bg-library-accent shadow-inner"
    )}
    style={{ transform: `translateX(-${100 - clamped}%)` }}
  />
    </ProgressPrimitive.Root>;
}
export { Progress };
