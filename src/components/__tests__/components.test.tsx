import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';
import { renderWithProviders } from '@/test/render';
import { Button } from '../Button';
import { Checkbox } from '../Checkbox';
import { useConfirm } from '../ConfirmDialog';
import { Segmented } from '../Segmented';
import { TextField } from '../TextField';

describe('Button', () => {
  it('is an accessible button that calls onPress', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Enregistrer" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Enregistrer" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Enregistrer' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Checkbox', () => {
  it('exposes its checked state and toggles', async () => {
    function Harness() {
      const [checked, setChecked] = useState(false);
      return <Checkbox checked={checked} onChange={setChecked} label="Loyer déjà passé" />;
    }
    await renderWithProviders(<Harness />);
    const box = screen.getByRole('checkbox', { name: 'Loyer déjà passé' });
    expect(box).not.toBeChecked();
    await fireEvent.press(box);
    expect(screen.getByRole('checkbox', { name: 'Loyer déjà passé' })).toBeChecked();
  });
});

describe('TextField', () => {
  it('labels the input and shows the error', async () => {
    const onChangeText = jest.fn();
    await renderWithProviders(
      <TextField label="Montant" value="" onChangeText={onChangeText} error="Montant illisible." />,
    );
    await fireEvent.changeText(screen.getByLabelText('Montant'), '12,50');
    expect(onChangeText).toHaveBeenCalledWith('12,50');
    expect(screen.getByText('Montant illisible.')).toBeOnTheScreen();
  });
});

describe('Segmented', () => {
  it('behaves as a radio group', async () => {
    const onChange = jest.fn();
    await renderWithProviders(
      <Segmented
        label="Type"
        value="exp"
        onChange={onChange}
        options={[
          { value: 'exp', label: 'Dépense' },
          { value: 'inc', label: 'Revenu' },
        ]}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Dépense' })).toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: 'Revenu' }));
    expect(onChange).toHaveBeenCalledWith('inc');
  });
});

describe('Confirmation dialog', () => {
  it('resolves true when confirmed', async () => {
    const results: boolean[] = [];
    function Harness() {
      const confirm = useConfirm();
      return (
        <Button
          label="Supprimer"
          onPress={() =>
            void confirm({ title: 'Supprimer ?', confirmLabel: 'Oui' }).then(r => results.push(r))
          }
        />
      );
    }
    await renderWithProviders(<Harness />);
    await fireEvent.press(screen.getByRole('button', { name: 'Supprimer' }));
    expect(await screen.findByText('Supprimer ?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Oui' }));
    await screen.findByRole('button', { name: 'Supprimer' });
    expect(results).toEqual([true]);
  });

  it('renders arbitrary children', async () => {
    await renderWithProviders(<Text>ok</Text>);
    expect(screen.getByText('ok')).toBeOnTheScreen();
  });
});
